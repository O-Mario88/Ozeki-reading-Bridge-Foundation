import { Program } from "@/lib/types";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <article className="card program-card">
      <h3>
        {program.id}. {program.title}
      </h3>
      <p>{program.summary}</p>
      <h4>Focus areas</h4>
      <ul>
        {program.focusAreas.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h4>Outputs</h4>
      <ul>
        {program.outputs.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        <strong>Outcome:</strong> {program.outcome}
      </p>
    </article>
  );
}
