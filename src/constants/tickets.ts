import {
  Bath,
  BedDouble,
  Bot,
  Boxes,
  ChefHat,
  DoorOpen,
  HelpCircle,
  Home,
  LayoutDashboard,
  Lightbulb,
  Monitor,
  Server,
  Shield,
  Thermometer,
  Trees,
  Tv,
  Wifi,
  Wrench,
} from 'lucide-react';
import type { TicketPriority, TicketStatus } from '../types/database';

export const ticketTypes = [
  'Problem',
  'Idee',
  'Erweiterungswunsch',
  'Automation',
  'Geräteproblem',
  'Dashboard-Wunsch',
  'Wartung',
  'Sonstiges',
] as const;

export const categories = [
  'Licht',
  'Heizung / Klima',
  'Sicherheit',
  'Medien',
  'Netzwerk',
  'Server',
  'Home Assistant',
  'Alexa',
  'Automationen',
  'Dashboard',
  'Matter / Thread',
  'Geräte',
  'Sonstiges',
] as const;

export const areas = [
  'Wohnzimmer',
  'Küche',
  'Schlafzimmer',
  'Bad',
  'Büro',
  'Server',
  'Eingangsbereich',
  'Balkon',
  'Allgemein',
] as const;

export const statusLabels: Record<TicketStatus, string> = {
  new: 'Neu',
  seen: 'Angesehen',
  planned: 'In Planung',
  in_progress: 'In Bearbeitung',
  waiting_feedback: 'Wartet auf Rückmeldung',
  waiting_parts: 'Wartet auf Teile',
  tested: 'Getestet',
  done: 'Erledigt',
  rejected: 'Abgelehnt',
  archived: 'Archiviert',
};

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Niedrig',
  normal: 'Normal',
  high: 'Hoch',
  urgent: 'Dringend',
};

export const statusOptions = Object.keys(statusLabels) as TicketStatus[];
export const priorityOptions = Object.keys(priorityLabels) as TicketPriority[];
export const closedStatuses: TicketStatus[] = ['done', 'rejected', 'archived'];

export const areaIcons = {
  Wohnzimmer: Home,
  Küche: ChefHat,
  Schlafzimmer: BedDouble,
  Bad: Bath,
  Büro: Monitor,
  Server,
  Eingangsbereich: DoorOpen,
  Balkon: Trees,
  Allgemein: Boxes,
};

export const categoryIcons = {
  Licht: Lightbulb,
  'Heizung / Klima': Thermometer,
  Sicherheit: Shield,
  Medien: Tv,
  Netzwerk: Wifi,
  Server,
  'Home Assistant': Home,
  Alexa: Bot,
  Automationen: Wrench,
  Dashboard: LayoutDashboard,
  'Matter / Thread': Boxes,
  Geräte: Boxes,
  Sonstiges: HelpCircle,
};

export const ticketTemplates = [
  {
    label: 'Etwas funktioniert nicht',
    type: 'Problem',
    category: 'Home Assistant',
    priority: 'normal' as TicketPriority,
    description: 'Was funktioniert nicht?\n\nSeit wann tritt das Problem auf?\n\nWas sollte stattdessen passieren?',
  },
  {
    label: 'Neue Automation',
    type: 'Automation',
    category: 'Automationen',
    priority: 'normal' as TicketPriority,
    description: 'Auslöser:\n\nGewünschte Aktion:\n\nBedingungen / Ausnahmen:',
  },
  {
    label: 'Dashboard verbessern',
    type: 'Dashboard-Wunsch',
    category: 'Dashboard',
    priority: 'low' as TicketPriority,
    description: 'Wo soll die Änderung erscheinen?\n\nWas soll angezeigt oder steuerbar sein?\n\nWie soll es sich verhalten?',
  },
];
