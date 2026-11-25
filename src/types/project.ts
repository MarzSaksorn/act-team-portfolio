import type { LocalizedText } from './content';
export type Project = {
  id: string; title: LocalizedText; summary: LocalizedText;
  status: 'planned' | 'in-progress' | 'completed';
  problem?: LocalizedText; businessModel?: LocalizedText;
  contributions?: { name: string; description: LocalizedText }[];
  dates?: string; links?: { label: LocalizedText; url: string }[];
};
