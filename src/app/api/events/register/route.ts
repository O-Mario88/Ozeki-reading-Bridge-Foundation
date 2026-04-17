import { NextResponse } from "next/server";
import { withPostgresClient } from "@/lib/server/postgres/client";
import { ensureTeacherRosterPostgres } from "@/lib/server/postgres/repositories/schools";
import type { SchoolContactRecord } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Minimal validation
    if (!body.trainingEventId || !body.schoolName || !body.teachers || !Array.isArray(body.teachers)) {
      return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
    }

    const { 
      trainingEventId, 
      schoolName, 
      emisNumber, 
      district,
      registeredByName,
      registeredByPhone,
      registeredByEmail,
      teachers 
    } = body;

    const result = await withPostgresClient(async (client) => {
      await client.query("BEGIN");
      
      try {
        // 1. FUZZY MATCH SCHOOL OR CREATE IT
        let targetSchoolId: number | null = null;
        
        // Exact EMIS match attempt
        if (emisNumber) {
          const emisMatch = await client.query(`SELECT id FROM schools_directory WHERE emis_number = $1 LIMIT 1`, [emisNumber]);
          if (emisMatch.rows.length > 0) targetSchoolId = Number(emisMatch.rows[0].id);
        }

        // Strict Fuzzy Name + District + Head Teacher match attempt
        if (!targetSchoolId) {
          const fuzzyMatch = await client.query(
            `SELECT id FROM schools_directory 
             WHERE lower(name) = lower($1) 
             AND lower(district) = lower($2) 
             AND (lower(contact_name) = lower($3) OR contact_phone = $4)
             LIMIT 1`, 
            [
              schoolName.trim(), 
              district?.trim() || '',
              registeredByName?.trim() || '',
              registeredByPhone?.trim() || ''
            ]
          );
          if (fuzzyMatch.rows.length > 0) targetSchoolId = Number(fuzzyMatch.rows[0].id);
        }

        // Create new record dynamically to avoid data loss
        if (!targetSchoolId) {
          const newSchool = await client.query(
            `INSERT INTO schools_directory (name, emis_number, district, contact_name, contact_phone, contact_email, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
            [schoolName.trim(), emisNumber || null, district?.trim() || null, registeredByName || null, registeredByPhone || null, registeredByEmail || null]
          );
          targetSchoolId = Number(newSchool.rows[0].id);
        }

        // 2. CREATE EVENT REGISTRATION (The bridging ticket)
        const registrationIdResult = await client.query(
          `INSERT INTO event_registrations (
            training_event_id, school_id, registered_by_name, registered_by_phone, registered_by_email,
            status, number_of_teachers, registration_source, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'Confirmed', $6, 'Web Form', NOW(), NOW()) RETURNING id`,
          [trainingEventId, targetSchoolId, registeredByName, registeredByPhone, registeredByEmail, teachers.length]
        );
        const registrationId = Number(registrationIdResult.rows[0].id);

        // 3. AUTO-GENERATE TEACHERS AND LINK TO EVENT
        for (const teacher of teachers) {
          // ensureTeacherRosterPostgres intelligently checks for duplicates via teacherUid
          // But since we are intaking fresh data from a form, we'll try to find an existing teacherUid by phone or name in this school
          let matchingUid: string | null = null;
          if (teacher.phone) {
             const phoneMatch = await client.query(`SELECT teacher_uid FROM teacher_roster WHERE school_id = $1 AND phone = $2 LIMIT 1`, [targetSchoolId, teacher.phone]);
             if (phoneMatch.rows.length > 0) matchingUid = String(phoneMatch.rows[0].teacher_uid);
          }
          if (!matchingUid) {
             const nameMatch = await client.query(`SELECT teacher_uid FROM teacher_roster WHERE school_id = $1 AND lower(full_name) = lower($2) LIMIT 1`, [targetSchoolId, teacher.fullName.trim()]);
             if (nameMatch.rows.length > 0) matchingUid = String(nameMatch.rows[0].teacher_uid);
          }

          const teacherUid = await ensureTeacherRosterPostgres(client, {
            teacherUid: matchingUid,
            schoolId: targetSchoolId,
            fullName: teacher.fullName,
            gender: teacher.gender as SchoolContactRecord["gender"] || "Other",
            phone: teacher.phone,
            email: teacher.email,
            classTaught: teacher.classTaught,
            roleTitle: teacher.role,
          });

          // Fetch the actual numeric teacher_id to link to the registration roster
          const teacherIdRes = await client.query(`SELECT id FROM teacher_roster WHERE teacher_uid = $1 LIMIT 1`, [teacherUid]);
          if (teacherIdRes.rows.length > 0) {
            const numericTeacherId = Number(teacherIdRes.rows[0].id);
            await client.query(
               `INSERT INTO event_registration_teachers (
                 event_registration_id, training_event_id, teacher_id, attendance_status, certificate_eligible, created_at, updated_at
               ) VALUES ($1, $2, $3, 'Pending', false, NOW(), NOW())`,
               [registrationId, trainingEventId, numericTeacherId]
            );
          }
        }

        // 4. BUMP SESSION COUNTS (Simulate a training event record in portal_records)
        const eventMatch = await client.query(`SELECT title FROM training_events WHERE id = $1 LIMIT 1`, [trainingEventId]);
        const eventTitle = eventMatch.rows.length > 0 ? eventMatch.rows[0].title : 'In-Person Training';
        
        await client.query(
          `INSERT INTO portal_records (
            school_id, school_name, module, date, status, program_type, payload_json, updated_at
          ) VALUES ($1, $2, 'training', NOW(), 'completed', $3, '{}', NOW())`,
          [targetSchoolId, schoolName, eventTitle]
        );

        await client.query("COMMIT");
        return { success: true, registrationId, targetSchoolId };
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Transaction Error:", err);
        throw err;
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Registration successful", 
      data: result 
    });

  } catch (error: unknown) {
    console.error("[Events API] Registration Error:", error);
    return NextResponse.json(
      { message: "Server expected an error processing the registration form.", details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}
