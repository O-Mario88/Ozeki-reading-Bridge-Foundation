import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400;

/**
 * OpenAPI 3.1 specification for the Ozeki National Intelligence v1 API.
 * Consumed by Swagger UI, Stoplight, Postman, and auto-generated clients.
 */
export async function GET(req: Request) {
  const base = new URL(req.url);
  const origin = `${base.protocol}//${base.host}`;

  const spec = buildOpenApiSpec(origin);

  const format = base.searchParams.get("format");
  if (format === "yaml") {
    // Simple JSON→YAML isn't in the stdlib; serve JSON with a note.
    return new NextResponse(
      "# YAML format not generated server-side. Use https://editor.swagger.io/ with the JSON spec at /api/v1/openapi.json",
      { status: 200, headers: { "Content-Type": "text/yaml; charset=utf-8" } },
    );
  }

  return NextResponse.json(spec);
}

function buildOpenApiSpec(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Ozeki National Intelligence API",
      description:
        "Authenticated read-only endpoints serving Uganda primary-literacy data to Ministry of Education, UNICEF, university researchers, and partner NGOs.\n\n" +
        "All data is aggregated and de-identified. See https://ozeki.org/developers/api for authentication and usage guidance.",
      version: "1.0.0",
      license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
      contact: { email: "data@ozekiread.org", name: "Ozeki Reading Bridge Foundation" },
    },
    servers: [{ url: `${origin}/api/v1`, description: "Production" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "ork_...",
          description: "API keys issued by Ozeki admin. Request via data@ozekiread.org.",
        },
      },
      schemas: {
        District: {
          type: "object",
          properties: {
            district: { type: "string" },
            region: { type: "string", nullable: true },
            schoolsCount: { type: "integer" },
          },
          required: ["district", "schoolsCount"],
        },
        Region: {
          type: "object",
          properties: {
            region: { type: "string" },
            schoolsCount: { type: "integer" },
            districtsCount: { type: "integer" },
            subCountiesCount: { type: "integer" },
          },
          required: ["region", "schoolsCount", "districtsCount"],
        },
        LiteracyIndicators: {
          type: "object",
          description: "EGRA-style snapshot of programme delivery + learner outcomes.",
          properties: {
            district: { type: "string" },
            region: { type: "string", nullable: true },
            schoolsCount: { type: "integer" },
            schoolsWithAssessments: { type: "integer" },
            learnersAssessed: { type: "integer", description: "Distinct learner UIDs across baseline/progress/endline cycles." },
            teachersTrained: { type: "integer" },
            coachingVisits: { type: "integer" },
            trainingSessions: { type: "integer" },
            fidelityObservations: { type: "integer" },
            fidelityPct: { type: "integer", minimum: 0, maximum: 100 },
            atOrAboveBenchmarkPct: { type: "number", description: "% of learners meeting/exceeding grade expectations." },
            baselineComposite: { type: "number", nullable: true, description: "0-100 composite of 5 reading domains." },
            endlineComposite: { type: "number", nullable: true },
            improvementPp: { type: "number", nullable: true, description: "endline − baseline, in percentage points." },
            asOf: { type: "string", format: "date-time" },
          },
        },
        NationalBenchmark: {
          type: "object",
          properties: {
            grade: { type: "string", example: "P3" },
            cycleType: { type: "string", enum: ["baseline", "progress", "endline"] },
            learnersAssessed: { type: "integer" },
            letterIdentification: { type: "number", nullable: true },
            soundIdentification: { type: "number", nullable: true },
            decodableWords: { type: "number", nullable: true },
            fluencyAccuracy: { type: "number", nullable: true },
            readingComprehension: { type: "number", nullable: true },
            compositeAvg: { type: "number", nullable: true },
            atOrAboveBenchmarkPct: { type: "number" },
          },
        },
        TimeSeriesPoint: {
          type: "object",
          properties: {
            month: { type: "string", example: "2026-03", description: "YYYY-MM, first day of month." },
            learnersAssessed: { type: "integer" },
            avgComprehension: { type: "number", nullable: true },
            avgFluency: { type: "number", nullable: true },
            avgComposite: { type: "number", nullable: true },
            coachingVisits: { type: "integer" },
            trainingSessions: { type: "integer" },
            observationsSubmitted: { type: "integer" },
            fidelityPct: { type: "integer" },
          },
        },
        GenderParityReport: {
          type: "object",
          properties: {
            asOf: { type: "string", format: "date-time" },
            overall: {
              type: "object",
              properties: {
                maleLearners: { type: "integer" },
                femaleLearners: { type: "integer" },
                maleAvgComposite: { type: "number", nullable: true },
                femaleAvgComposite: { type: "number", nullable: true },
                parityIndex: {
                  type: "number",
                  nullable: true,
                  description: "female/male ratio. 1.00 = parity. >1 female ahead; <1 female behind.",
                },
                gapPp: { type: "number", nullable: true },
              },
            },
            byGrade: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  maleLearners: { type: "integer" },
                  femaleLearners: { type: "integer" },
                  maleAvgComposite: { type: "number", nullable: true },
                  femaleAvgComposite: { type: "number", nullable: true },
                  parityIndex: { type: "number", nullable: true },
                },
              },
            },
          },
        },
        SchoolRow: {
          type: "object",
          description: "Aggregated, anonymised school record. No PII.",
          properties: {
            schoolId: { type: "integer" },
            schoolCode: { type: "string" },
            district: { type: "string" },
            region: { type: "string" },
            subCounty: { type: "string" },
            enrollmentTotal: { type: "integer" },
            learnersAssessed: { type: "integer" },
            baselineComposite: { type: "number", nullable: true },
            endlineComposite: { type: "number", nullable: true },
            improvementPp: { type: "number", nullable: true },
            fidelityPct: { type: "integer" },
            coachingVisits: { type: "integer" },
          },
        },
        GradeOutcomeRow: {
          type: "object",
          properties: {
            grade: { type: "string" },
            learnersAssessed: { type: "integer" },
            letterIdentification: { type: "number", nullable: true },
            soundIdentification: { type: "number", nullable: true },
            decodableWords: { type: "number", nullable: true },
            fluencyAccuracy: { type: "number", nullable: true },
            readingComprehension: { type: "number", nullable: true },
            composite: { type: "number", nullable: true },
          },
        },
        DataQualityRow: {
          type: "object",
          properties: {
            district: { type: "string" },
            region: { type: "string", nullable: true },
            totalSchools: { type: "integer" },
            schoolsWithBaseline: { type: "integer" },
            schoolsWithEndline: { type: "integer" },
            baselineCoveragePct: { type: "number" },
            endlineCoveragePct: { type: "number" },
            learnersWithUidPct: { type: "number" },
            avgVisitsPerSchool: { type: "number" },
            avgObservationsPerSchool: { type: "number" },
            score: { type: "integer", minimum: 0, maximum: 100 },
            grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
          },
        },
        ListMeta: {
          type: "object",
          properties: {
            count: { type: "integer" },
            total: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
            hasMore: { type: "boolean" },
            asOf: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
        },
      },
      parameters: {
        FormatParam: {
          name: "format",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["json", "csv"] },
          description: "Response format. Also controllable via Accept header.",
        },
        LimitParam: {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 1000, default: 100 },
        },
        OffsetParam: {
          name: "offset",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 0, default: 0 },
        },
      },
    },
    paths: {
      "/districts": {
        get: {
          summary: "List all districts",
          description: "Returns every district with at least one school on the platform.",
          tags: ["Geography"],
          parameters: [{ $ref: "#/components/parameters/FormatParam" }],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/District" } },
                      meta: { $ref: "#/components/schemas/ListMeta" },
                    },
                  },
                },
                "text/csv": { schema: { type: "string" } },
              },
            },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/districts/{district}/literacy-indicators": {
        get: {
          summary: "Literacy indicators for one district",
          tags: ["Geography", "Literacy"],
          parameters: [
            { name: "district", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/LiteracyIndicators" } } } },
            "404": { description: "District not found" },
          },
        },
      },
      "/regions": {
        get: {
          summary: "List all regions",
          tags: ["Geography"],
          parameters: [{ $ref: "#/components/parameters/FormatParam" }],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Region" } },
                      meta: { $ref: "#/components/schemas/ListMeta" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/regions/{region}/literacy-indicators": {
        get: {
          summary: "Literacy indicators for one region",
          tags: ["Geography", "Literacy"],
          parameters: [{ name: "region", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/LiteracyIndicators" } } } },
            "404": { description: "Region not found" },
          },
        },
      },
      "/schools": {
        get: {
          summary: "Paginated list of schools (aggregated, anonymised)",
          description: "Returns per-school aggregates only; no PII or named individuals.",
          tags: ["Schools"],
          parameters: [
            { name: "region", in: "query", required: false, schema: { type: "string" } },
            { name: "district", in: "query", required: false, schema: { type: "string" } },
            { $ref: "#/components/parameters/LimitParam" },
            { $ref: "#/components/parameters/OffsetParam" },
            { $ref: "#/components/parameters/FormatParam" },
          ],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/SchoolRow" } },
                      meta: { $ref: "#/components/schemas/ListMeta" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/national/benchmarks": {
        get: {
          summary: "National reading benchmarks by grade × cycle",
          description: "Minimum 10 unique learners per cell.",
          tags: ["National"],
          parameters: [{ $ref: "#/components/parameters/FormatParam" }],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/NationalBenchmark" } },
                      meta: { $ref: "#/components/schemas/ListMeta" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/national/time-series": {
        get: {
          summary: "Monthly trajectory of delivery + outcomes",
          tags: ["National"],
          parameters: [
            { name: "months", in: "query", required: false, schema: { type: "integer", minimum: 3, maximum: 60, default: 12 } },
            { $ref: "#/components/parameters/FormatParam" },
          ],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/TimeSeriesPoint" } },
                      meta: { $ref: "#/components/schemas/ListMeta" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/national/gender-parity": {
        get: {
          summary: "Gender parity index — overall + by grade",
          tags: ["National", "Gender"],
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/GenderParityReport" } } } },
          },
        },
      },
      "/outcomes/by-grade": {
        get: {
          summary: "Domain-level outcomes by grade",
          tags: ["Outcomes"],
          parameters: [{ $ref: "#/components/parameters/FormatParam" }],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/GradeOutcomeRow" } },
                      meta: { $ref: "#/components/schemas/ListMeta" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/data-quality": {
        get: {
          summary: "Per-district data-quality scores",
          description: "Composite score (0-100) based on baseline/endline coverage, UID completeness, coaching + observation frequency.",
          tags: ["Data Quality"],
          parameters: [{ $ref: "#/components/parameters/FormatParam" }],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/DataQualityRow" } },
                      meta: { $ref: "#/components/schemas/ListMeta" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/programmes/comparisons": {
        get: {
          summary: "Programme-level benchmark distributions",
          tags: ["Programmes"],
          parameters: [{ $ref: "#/components/parameters/FormatParam" }],
          responses: {
            "200": { description: "OK" },
          },
        },
      },
    },
    tags: [
      { name: "Geography", description: "Districts, regions, sub-counties." },
      { name: "Literacy", description: "Assessment-based indicators." },
      { name: "Schools", description: "Per-school aggregates." },
      { name: "National", description: "Uganda-wide aggregates." },
      { name: "Gender", description: "Gender parity indices." },
      { name: "Outcomes", description: "Learner outcome distributions." },
      { name: "Data Quality", description: "Submission compliance + completeness scores." },
      { name: "Programmes", description: "Cross-programme benchmarks." },
    ],
  };
}
