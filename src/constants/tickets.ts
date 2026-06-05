import { Home, Lightbulb, Thermometer, Shield, Tv, Wifi, Server, Bot, LayoutDashboard, Boxes, Wrench, HelpCircle, DoorOpen, ChefHat, Bath, BedDouble, Monitor, Trees } from 'lucide-react';
import type { TicketPriority, TicketStatus } from '../types/database';

export const ticketTypes = ['Problem', 'Idee', 'Erweiterungswunsch', 'Automation', 'Geräteproblem', 'Dashboard-Wunsch', 'Wartung', 'Sonstiges'] as const;
export const categories = ['Licht', 'Heizung / Klima', 'Sicherheit', 'Medien', 'Netzwerk', 'Server', 'Home Assistant', 'Alexa', 'Automationen', 'Dashboard', 'Matter / Thread', 'Geräte', 'Sonstiges'] as const;
export const areas = ['Wohnzimmer', 'Küche', 'Schlafzimmer', 'Bad', 'Büro', 'Server', 'Eingangsbereich', 'Balkon', 'Allgemein'] as const;

export const statusLabels: Record<TicketStatus, string> = {
  new: 'Neu', seen: 'Angesehen', planned: 'In Planung', in_progress: 'In Bearbeitung', waiting_feedback: 'Wartet auf Rückmeldung', waiting_parts: 'Wartet auf Teile', tested: 'Getestet', done: 'Erledigt', rejected: 'Abgelehnt', archived: 'Archiviert',
};
export const priorityLabels: Record<TicketPriority, string> = { low: 'Niedrig', normal: 'Normal', high: 'Hoch', urgent: 'Dringend' };
export const statusOptions = Object.keys(statusLabels) as TicketStatus[];
export const priorityOptions = Object.keys(priorityLabels) as TicketPriority[];

export const areaIcons = {
  Wohnzimmer: Home, Küche: ChefHat, Schlafzimmer: BedDouble, Bad: Bath, Büro: Monitor, Server, Eingangsbereich: DoorOpen, Balkon: Trees, Allgemein: Boxes,
};
export const categoryIcons = {
  Licht: Lightbulb, 'Heizung / Klima': Thermometer, Sicherheit: Shield, Medien: Tv, Netzwerk: Wifi, Server, 'Home Assistant': Home, Alexa: Bot, Automationen: Wrench, Dashboard: LayoutDashboard, 'Matter / Thread': Boxes, Geräte: Boxes, Sonstiges: HelpCircle,
};
