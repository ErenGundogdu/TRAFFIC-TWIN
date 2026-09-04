"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOperatorNoteSchema,
  type CreateOperatorNote,
  type NoteAcknowledgement,
} from "@traffic-twin/contracts";
import { useForm } from "react-hook-form";

import { useOperatorNotes } from "../hooks/use-operator-notes";

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
    defaultValues: { assetId, author: "", content: "" },
  });

  async function submit(input: CreateOperatorNote) {
    const acknowledgement = await createNote({ ...input, assetId });

    if (!acknowledgement.ok) {
      form.setError("root", { message: acknowledgement.error.message });
      return;
    }

    form.reset({ assetId, author: input.author, content: "" });
  }

  return (
    <section className="mt-6 border-t border-slate-200 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Operatör notları
        </h3>
        <span className="text-[11px] text-slate-500">
          {notesQuery.data?.length ?? 0} kayıt
        </span>
      </div>

      <form onSubmit={form.handleSubmit(submit)} className="mt-3 space-y-3">
        <input type="hidden" {...form.register("assetId")} value={assetId} />
        <label className="block text-xs font-medium text-slate-600">
          Operatör
          <input
            {...form.register("author")}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
            placeholder="Adınız"
          />
          <span className="mt-1 block text-[11px] text-rose-600">
            {form.formState.errors.author?.message}
          </span>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Not
          <textarea
            {...form.register("content")}
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
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
        ) : notesQuery.data?.length ? (
          notesQuery.data.map((note) => (
            <article
              key={note.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <strong className="text-slate-700">{note.author}</strong>
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
