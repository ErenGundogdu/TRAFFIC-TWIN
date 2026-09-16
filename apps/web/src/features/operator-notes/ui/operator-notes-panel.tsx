"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOperatorNoteSchema,
  type CreateOperatorNote,
  type NoteAcknowledgement,
} from "@traffic-twin/contracts";
import { useForm } from "react-hook-form";

import { InlineQueryError } from "@/shared/ui";

import { useOperatorNotes } from "../hooks/use-operator-notes";
import {
  getOperatorNoteCategoryLabel,
  getOperatorNoteStatusClassName,
  getOperatorNoteStatusLabel,
  operatorNoteCategoryOptions,
  operatorNoteStatusOptions,
} from "../model/operator-note-presentation";

interface OperatorNotesPanelProps {
  assetId: string;
  timeZone: string;
  createNote: (input: CreateOperatorNote) => Promise<NoteAcknowledgement>;
  realtimeConnected: boolean;
}

export function OperatorNotesPanel({
  assetId,
  timeZone,
  createNote,
  realtimeConnected,
}: OperatorNotesPanelProps) {
  const notesQuery = useOperatorNotes(assetId);
  const form = useForm<CreateOperatorNote>({
    resolver: zodResolver(createOperatorNoteSchema),
    defaultValues: {
      assetId,
      author: "",
      category: "GENERAL",
      status: "INFORMATIONAL",
      content: "",
    },
  });

  async function submit(input: CreateOperatorNote) {
    const acknowledgement = await createNote({ ...input, assetId });

    if (!acknowledgement.ok) {
      form.setError("root", { message: acknowledgement.error.message });
      return;
    }

    form.reset({
      assetId,
      author: input.author,
      category: input.category,
      status: input.status,
      content: "",
    });
  }

  return (
    <section className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Operatör notları
        </h3>
        <span className="text-[11px] text-slate-500">
          {notesQuery.data?.length ?? 0} kayıt
        </span>
      </div>

      <form onSubmit={form.handleSubmit(submit)} className="mt-3 space-y-3">
        <input type="hidden" {...form.register("assetId")} value={assetId} />
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Kategori
            <select
              {...form.register("category")}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {operatorNoteCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Durum
            <select
              {...form.register("status")}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {operatorNoteStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
          Operatör
          <input
            {...form.register("author")}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Adınız"
          />
          <span className="mt-1 block text-[11px] text-rose-600">
            {form.formState.errors.author?.message}
          </span>
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
          Not
          <textarea
            {...form.register("content")}
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Sahadaki durumu kaydedin…"
          />
          <span className="mt-1 block text-[11px] text-rose-600">
            {form.formState.errors.content?.message}
          </span>
        </label>
        {form.formState.errors.root?.message ? (
          <p className="text-xs text-rose-600">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!realtimeConnected || form.formState.isSubmitting}
          className="w-full rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {!realtimeConnected
            ? "Canlı bağlantı bekleniyor"
            : form.formState.isSubmitting
              ? "Kaydediliyor…"
              : "Notu kaydet"}
        </button>
      </form>

      <div className="mt-4 space-y-2" aria-live="polite">
        {notesQuery.isPending ? (
          <p className="text-xs text-slate-500">Notlar yükleniyor…</p>
        ) : notesQuery.isError ? (
          <InlineQueryError
            message="Operatör notları alınamadı."
            onRetry={() => void notesQuery.refetch()}
          />
        ) : notesQuery.data?.length ? (
          notesQuery.data.map((note) => (
            <article
              key={note.id}
              className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <strong className="text-slate-700 dark:text-slate-200">
                    {note.author}
                  </strong>
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    {getOperatorNoteCategoryLabel(note.category)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${getOperatorNoteStatusClassName(note.status)}`}
                  >
                    {getOperatorNoteStatusLabel(note.status)}
                  </span>
                </div>
                <time className="text-slate-400">
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone,
                  }).format(new Date(note.createdAt))}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                {note.content}
              </p>
            </article>
          ))
        ) : (
          <p className="text-xs text-slate-500">Bu istasyonda henüz not yok.</p>
        )}
      </div>
    </section>
  );
}
