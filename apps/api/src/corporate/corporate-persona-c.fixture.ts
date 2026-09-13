/** Persona C — relocating professional household set (PRD §5). */
export const PERSONA_C_RELOCATION_ITEMS: Array<{
  title: string;
  notes?: string;
}> = [
  { title: '55" Smart TV', notes: 'Living room wall mount' },
  { title: '3-seater sofa', notes: 'Fabric, good condition' },
  { title: '2-seater sofa', notes: 'Matching set' },
  { title: 'Dining table + 6 chairs', notes: 'Solid wood' },
  { title: 'King bed frame + mattress', notes: 'Master bedroom' },
  { title: 'Queen bed frame', notes: 'Guest room' },
  { title: 'Microwave oven', notes: 'Kitchen countertop' },
  { title: 'Petrol generator 3.5kVA', notes: 'Backup power' },
  { title: 'Toyota Camry 2018', notes: 'Vehicle — inspection recommended' },
  { title: 'Standing fridge/freezer', notes: 'Kitchen appliance' },
  { title: 'Washing machine', notes: 'Front-load' },
  { title: 'Air conditioner 1.5HP', notes: 'Split unit' },
];

export function personaCItemTitles(): string[] {
  return PERSONA_C_RELOCATION_ITEMS.map((i) => i.title);
}
