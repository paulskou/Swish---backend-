import type { VercelRequest, VercelResponse } from '@vercel/node';
import rules from '../rules.json';

type BranchKey = 'short' | 'long' | 'left_right';

function classify(inputText?: string, missType?: string): BranchKey | null {
  if (missType && ['short','long','left_right'].includes(missType)) return missType as BranchKey;
  if (!inputText) return null;
  const txt = inputText.toLowerCase();
  const candidates: BranchKey[] = ['short','long','left_right'];
  for (const k of candidates) {
    const terms: string[] = (rules as any).parser[k];
    if (terms.some(t => txt.includes(t))) return k;
  }
  return null;
}

function buildReport(branch: BranchKey, youSaid: string) {
  const b = (rules as any).branches[branch];
  const lines: string[] = [];
  const today = new Date().toLocaleDateString();
  const bullets = (youSaid || '').split(/[;,]+/).map(s => s.trim()).filter(Boolean);

  lines.push(`Shot Report — ${today}`);
  lines.push('');
  lines.push('You Said:');
  (bullets.length ? bullets : [youSaid]).forEach(s => lines.push(`- ${s}`));
  lines.push('');
  lines.push('Diagnosis:');
  b.diagnosis.forEach((d: string) => lines.push(`- ${d}`));
  lines.push('');
  lines.push('Priority Corrections:');
  b.corrections.forEach((c: any, i: number) => lines.push(`${i+1}. ${c.cue} — ${c.biomech}`));
  lines.push('');
  lines.push('Workout (20–30 min):');
  lines.push(`- Anchor: ${b.workout.anchor.name}`);
  lines.push(`  - Instructions: ${b.workout.anchor.instructions}`);
  lines.push(`  - Dosage: ${b.workout.anchor.dosage}`);
  b.workout.reinforcers.forEach((r: any, idx: number) => {
    lines.push(`- Reinforcer ${String.fromCharCode(65+idx)}: ${r.name}`);
    lines.push(`  - Instructions: ${r.instructions}`);
    lines.push(`  - Dosage: ${r.dosage}`);
  });
  lines.push('');
  lines.push('Session Checklist:');
  b.checklist.forEach((c: string) => lines.push(`- ${c}`));
  lines.push('');
  lines.push('Metrics:');
  b.metrics.forEach((m: string) => lines.push(`- ${m}`));

  return lines.join('\n');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { input_text, miss_type } = (req.body || {}) as { input_text?: string; miss_type?: string };
    const branch = classify(input_text, miss_type);
    if (!branch) return res.status(400).json({ error: 'Provide miss_type (short|long|left_right) or descriptive input_text.' });
    const report = buildReport(branch, input_text || miss_type || '');
    res.status(200).json({ branch, report });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Server error' });
  }
}
