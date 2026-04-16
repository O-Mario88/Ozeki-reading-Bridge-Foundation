"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EventRegistrationForm({ eventId, eventTitle }: { eventId: number, eventTitle: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // School Form State
  const [school, setSchool] = useState({
    schoolName: "",
    emisNumber: "",
    district: "",
    registeredByName: "",
    registeredByPhone: "",
    registeredByEmail: "",
  });

  // Teachers Roster State
  const [teachers, setTeachers] = useState([{ fullName: "", phone: "", email: "", role: "", classTaught: "", gender: "Other" }]);

  const handleSchoolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSchool({ ...school, [e.target.name]: e.target.value });
  };

  const handleTeacherChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newTeachers = [...teachers];
    // @ts-expect-error type inference mismatch on dynamic assignment
    newTeachers[index][e.target.name] = e.target.value;
    setTeachers(newTeachers);
  };

  const addTeacher = () => {
    setTeachers([...teachers, { fullName: "", phone: "", email: "", role: "", classTaught: "", gender: "Other" }]);
  };

  const removeTeacher = (index: number) => {
    if (teachers.length > 1) {
      const newTeachers = teachers.filter((_, i) => i !== index);
      setTeachers(newTeachers);
    }
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    setError(null);

    // Minimal validation
    if (!school.schoolName || !school.registeredByName) {
      setError("Please fill in all required school and contact fields.");
      setIsSubmitting(false);
      return;
    }
    
    // Verify teachers
    for (const t of teachers) {
      if (!t.fullName) {
        setError("Please ensure all teachers have a full name.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainingEventId: eventId,
          ...school,
          teachers,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit registration.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="registration-success card text-center p-8">
        <h2 className="text-2xl font-bold text-green-600 mb-4">Registration Confirmed!</h2>
        <p className="mb-6">Thank you. {school.schoolName} has successfully registered {teachers.length} teachers for the {eventTitle}.</p>
        <button onClick={() => router.push("/events")} className="btn btn-primary">Back to Events</button>
      </div>
    );
  }

  return (
    <div className="event-registration-form max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-sm border border-[var(--border-color)]">
      <div className="steps flex items-center mb-8 justify-between">
        <div className={`step flex-1 text-center font-bold ${step === 1 ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)] pb-2' : 'text-gray-400 pb-2'}`}>1. School Info</div>
        <div className={`step flex-1 text-center font-bold ${step === 2 ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)] pb-2' : 'text-gray-400 pb-2'}`}>2. Teacher Roster</div>
        <div className={`step flex-1 text-center font-bold ${step === 3 ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)] pb-2' : 'text-gray-400 pb-2'}`}>3. Confirm</div>
      </div>

      {error && <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-md border border-red-200">{error}</div>}

      {step === 1 && (
        <div className="step-1-content space-y-4">
          <h3 className="text-xl font-semibold mb-4">School Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">School Name *</label>
              <input type="text" name="schoolName" value={school.schoolName} onChange={handleSchoolChange} className="w-full p-2 border rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">EMIS Number (Optional)</label>
              <input type="text" name="emisNumber" value={school.emisNumber} onChange={handleSchoolChange} className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">District</label>
              <input type="text" name="district" value={school.district} onChange={handleSchoolChange} className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4 mt-8">Contact Person</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium mb-1">Your Full Name *</label>
               <input type="text" name="registeredByName" value={school.registeredByName} onChange={handleSchoolChange} className="w-full p-2 border rounded-md" required />
            </div>
            <div>
               <label className="block text-sm font-medium mb-1">Phone Number</label>
               <input type="tel" name="registeredByPhone" value={school.registeredByPhone} onChange={handleSchoolChange} className="w-full p-2 border rounded-md" />
            </div>
          </div>
          
          <div className="flex justify-end mt-8">
            <button onClick={() => setStep(2)} className="bg-[var(--accent-color)] text-white px-6 py-2 rounded-lg hover:opacity-90 font-medium">Continue to Roster</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step-2-content space-y-6">
          <h3 className="text-xl font-semibold">Teacher Roster</h3>
          <p className="text-sm text-gray-600 mb-4">Add all teachers from your school who will be attending this event.</p>
          
          {teachers.map((teacher, index) => (
            <div key={index} className="teacher-entry p-4 bg-gray-50 border rounded-lg relative">
              {teachers.length > 1 && (
                <button onClick={() => removeTeacher(index)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
              )}
              <h4 className="font-medium mb-3">Teacher {index + 1}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Full Name *</label>
                  <input type="text" name="fullName" value={teacher.fullName} onChange={(e) => handleTeacherChange(index, e)} className="w-full mt-1 p-2 border rounded-md bg-white" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Role / Title</label>
                  <input type="text" name="role" placeholder="e.g. Head Teacher, P2 Teacher" value={teacher.role} onChange={(e) => handleTeacherChange(index, e)} className="w-full mt-1 p-2 border rounded-md bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Phone</label>
                  <input type="tel" name="phone" value={teacher.phone} onChange={(e) => handleTeacherChange(index, e)} className="w-full mt-1 p-2 border rounded-md bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Gender</label>
                  <select name="gender" value={teacher.gender} onChange={(e) => handleTeacherChange(index, e)} className="w-full mt-1 p-2 border rounded-md bg-white">
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button onClick={addTeacher} className="w-full py-3 border-2 border-dashed border-[var(--accent-color)] text-[var(--accent-color)] rounded-lg font-medium hover:bg-[var(--accent-color)] hover:bg-opacity-5">+ Add Another Teacher</button>

          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(1)} className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
            <button onClick={() => setStep(3)} className="bg-[var(--accent-color)] text-white px-6 py-2 rounded-lg hover:opacity-90 font-medium">Review & Submit</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step-3-content space-y-6">
          <h3 className="text-xl font-semibold">Review Registration</h3>
          
          <div className="review-block bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-bold text-gray-700 tracking-wide uppercase text-sm mb-2">School Information</h4>
            <p className="text-lg"><strong>{school.schoolName}</strong> {school.district && <span className="text-gray-500">({school.district})</span>}</p>
            <p className="text-sm mt-1 text-gray-600">Registered by: {school.registeredByName} {school.registeredByPhone && `- ${school.registeredByPhone}`}</p>
          </div>

          <div className="review-block bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-bold text-gray-700 tracking-wide uppercase text-sm mb-3">Attending Teachers ({teachers.length})</h4>
            <ul className="divide-y">
              {teachers.map((t, i) => (
                <li key={i} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{t.fullName}</p>
                    <p className="text-xs text-gray-500">{t.role || "Teacher"} • {t.gender}</p>
                  </div>
                  {t.phone && <p className="text-sm text-gray-600 font-mono">{t.phone}</p>}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(2)} className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50" disabled={isSubmitting}>Back</button>
            <button onClick={submitForm} disabled={isSubmitting} className="bg-[var(--primary-color)] text-white px-8 py-3 rounded-lg hover:opacity-90 font-bold shadow-md shadow-[var(--primary-color)]/20 transition-all flex items-center justify-center min-w-[200px]">
              {isSubmitting ? "Registering..." : `Register ${teachers.length} Teachers`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
