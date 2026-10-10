import type { Lesson, ScheduleCatalog } from '#schedule/types.ts';
import type { SlotAdvice } from '#schedule/conflicts.ts';
import type { useBoard } from '#app/providers.tsx';

export type SummaryInput = {
  catalog: ScheduleCatalog;
  lessons: Lesson[];
  board: Pick<ReturnType<typeof useBoard>, 'ghost' | 'hold' | 'repeat' | 'overKey' | 'overUnassign' | 'advice'>;
};
type TransferSummary = {
  code: string;
  title: string;
  detail: string;
  destination: string;
  tone: 'neutral' | 'ok' | 'warning' | 'bad';
};

export function transferSummary({ catalog, lessons, board }: SummaryInput): TransferSummary | null {
  const carried = board.ghost ?? board.hold.hand;
  if (carried === null) return null;

  let sourceId: string | undefined;
  if (carried.kind === 'lesson') sourceId = carried.lessonId;

  if ('originLessonId' in carried && typeof carried.originLessonId === 'string') sourceId = carried.originLessonId;

  const source = lessons.find((lesson) => lesson.id === sourceId);
  const sectionId = carried.kind === 'section' ? carried.sectionId : source?.sectionId;
  const section = catalog.sections.find((item) => item.id === sectionId);
  const summary: TransferSummary = {
    code: section?.code ?? 'Занятие',
    title: 'Выберите место',
    detail: 'Наведите карточку на ячейку или выберите её стрелками',
    destination: '',
    tone: 'neutral',
  };
  if (board.overUnassign) {
    const removing = carried.kind === 'lesson';

    return { ...summary, title: removing ? 'Убрать из расписания' : 'Вернуть в список', detail: removing ? 'Занятие станет нераспределённым' : 'Секция останется без нового занятия', tone: 'warning' };
  }

  const day = catalog.weekDays.find((item) => board.overKey?.startsWith(`${item.id}|`));
  const slot = catalog.timeSlots.find((item) => board.overKey === `${day?.id}|${item.id}`);
  if (!day || !slot) return summary;

  summary.destination = `${day.label}, ${slot.start}–${slot.end}`;
  const inCell = lessons.filter((lesson) => lesson.day === day.id && lesson.timeSlotId === slot.id);
  const copying = board.repeat || (board.ghost?.kind === 'lesson' && board.ghost.copy);
  const sameSlot = source?.day === day.id && source.timeSlotId === slot.id;
  if (sameSlot && !copying) {
    const reorder = carried.kind === 'lesson' && inCell.length === 2;

    return { ...summary, title: reorder ? 'Изменить порядок' : 'Исходное место', detail: reorder ? 'Выберите позицию карточки в этой ячейке' : 'Размещение здесь отменит перенос', tone: 'neutral' };
  }

  const advice = board.advice.get(board.overKey ?? '');
  if (advice === null || advice === undefined) return summary;

  if (advice.text === 'Убрать') {
    return { ...summary, title: 'Убрать занятие', detail: 'Занятие этой секции будет удалено из ячейки', tone: 'warning' };
  }

  if (advice.ok === false) {
    const detail = conflictDetail({ advice, catalog, inCell, sectionCode: summary.code, studentsCount: section?.studentsCount ?? 0 });

    return { ...summary, title: 'Нельзя поставить', detail, tone: 'bad' };
  }

  if (advice.needsChoice) {
    return { ...summary, title: 'Открыть редактор', detail: 'Перед размещением выберите преподавателя или оставьте занятие без него', tone: 'warning' };
  }

  const room = catalog.rooms.find((item) => item.id === advice.roomId);
  const title = copying ? 'Добавить копию' : 'Можно поставить';

  return { ...summary, title, detail: room ? `Аудитория ${room.name} · ${room.capacity} мест` : 'Преподаватель и аудитория свободны', tone: 'ok' };
}

function conflictDetail(input: { advice: SlotAdvice; catalog: ScheduleCatalog; inCell: Lesson[]; sectionCode: string; studentsCount: number }): string {
  const { advice, catalog, inCell, sectionCode } = input;
  if (advice.text === 'У секции уже есть занятие в этом слоте') return `У секции ${sectionCode} уже есть занятие в это время`;

  const teacher = catalog.teachers.find((item) => item.id === advice.teacherId);
  if (advice.text === 'Преподаватель занят') {
    const occupied = inCell.find((lesson) => lesson.teacherId === advice.teacherId);
    const section = catalog.sections.find((item) => item.id === occupied?.sectionId);

    return `${teacher?.shortName ?? 'Преподаватель'} уже ведёт ${section?.code ?? 'другое занятие'} в это время`;
  }

  if (advice.text === 'Аудитория занята') {
    const room = catalog.rooms.find((item) => item.id === advice.roomId);
    const occupied = inCell.find((lesson) => lesson.roomId === advice.roomId);
    const section = catalog.sections.find((item) => item.id === occupied?.sectionId);

    return `Аудитория ${room?.name ?? ''} занята: ${section?.code ?? 'другое занятие'}`;
  }

  if (advice.text === 'Нет аудитории нужной вместимости') return `Нужна аудитория минимум на ${input.studentsCount} мест; подходящих по вместимости нет`;

  if (advice.text === 'Нет свободной аудитории') return `Все аудитории на ${input.studentsCount} и более мест заняты в это время`;

  if (teacher && catalog.blockedSlots.some((item) => item.teacherId === teacher.id && item.reason === advice.text)) {
    return `${teacher.shortName}: ${advice.text}`;
  }

  return advice.text ?? 'Не удалось проверить назначение: выберите ячейку заново';
}
