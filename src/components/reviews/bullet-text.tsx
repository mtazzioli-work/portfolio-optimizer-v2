import type { BulletField } from "@/lib/claude-analysis";

function parseStringToBullets(text: string): string[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines
    .map((line) =>
      line.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "").trim(),
    )
    .filter(Boolean);

  if (bullets.length <= 1 && !/^[-•*]\s/m.test(text) && !/^\d+\.\s/m.test(text)) {
    return [text.trim()];
  }
  return bullets;
}

export function toBulletItems(value: BulletField): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return parseStringToBullets(value);
}

type Props = {
  value: BulletField;
  className?: string;
};

export function BulletText({ value, className }: Props) {
  const items = toBulletItems(value);
  if (items.length === 0) return null;

  if (items.length === 1) {
    return <p className={className ?? "text-sm leading-relaxed"}>{items[0]}</p>;
  }

  return (
    <ul className={className ?? "list-disc space-y-1.5 pl-5 text-sm leading-relaxed"}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
