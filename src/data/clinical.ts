/** Reference atlas navigation; no patient record or measured vital signs. */
export type OrganId = 'body' | 'lungs' | 'heart' | 'brain' | 'spine';
export type ShaderMode = 'tissue' | 'perfusion' | 'xray';
export type QualityMode = 'balanced' | 'high';
export type SceneLayers = { shell: boolean; skeleton: boolean; organs: boolean };
export type Region = {
  id: OrganId;
  label: string;
  eyebrow: string;
  subtitle: string;
};
export const REGIONS: Region[] = [
  { id: 'body', label: 'Full body', eyebrow: 'SYSTEM OVERVIEW', subtitle: 'Human reference anatomy' },
  { id: 'lungs', label: 'Lungs', eyebrow: 'RESPIRATORY SYSTEM', subtitle: 'Pulmonary anatomy' },
  { id: 'heart', label: 'Heart', eyebrow: 'CARDIOVASCULAR SYSTEM', subtitle: 'Cardiac anatomy' },
  { id: 'brain', label: 'Brain', eyebrow: 'NEUROLOGICAL SYSTEM', subtitle: 'Cerebral anatomy' },
  { id: 'spine', label: 'Spine', eyebrow: 'SKELETAL SYSTEM', subtitle: 'Vertebral anatomy' },
];
