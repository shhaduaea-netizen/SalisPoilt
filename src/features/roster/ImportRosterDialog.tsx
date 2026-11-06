import { useRef, useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, FileSpreadsheet, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { inputClass } from '@/shared/ui/Field';
import {
  commitRosterImport,
  previewRosterImport,
  RosterError,
  type RosterImportPreview,
  type RosterImportResult,
  type RosterValidationIssue,
} from '@/features/roster/rosterApi';
import { readRosterFile, type RosterFileRow } from '@/features/roster/rosterSheet';
import { provisionRosterAccounts, type ProvisionReport } from '@/features/roster/provisionRosterAccounts';
import { useRanks } from '@/features/roster/useRoster';

type Stage =
  | { kind: 'choose' }
  | { kind: 'working'; label: 'reading' | 'checking' }
  | { kind: 'review'; rows: RosterFileRow[]; preview: RosterImportPreview }
  | { kind: 'invalid'; issues: RosterValidationIssue[] }
  | { kind: 'importing'; rows: RosterFileRow[]; done: number }
  | { kind: 'done'; result: RosterImportResult; accounts: ProvisionReport; total: number }
  | { kind: 'error'; reason: 'unreadable' | 'empty' | 'failed' };

const MAX_LISTED_ISSUES = 20;

export function ImportRosterDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'choose' });
  const ranksQuery = useRanks();
  const ranks = ranksQuery.data?.ranks ?? [];

  const reset = () => setStage({ kind: 'choose' });

  const handleOpenChange = (next: boolean) => {
    if (!next && stage.kind === 'importing') return;
    if (!next) reset();
    onOpenChange(next);
  };

  const checkFile = async (file: File) => {
    setStage({ kind: 'working', label: 'reading' });
    let rows: RosterFileRow[];
    try {
      rows = await readRosterFile(file);
    } catch {
      setStage({ kind: 'error', reason: 'unreadable' });
      return;
    }
    if (rows.length === 0) {
      setStage({ kind: 'error', reason: 'empty' });
      return;
    }
    setStage({ kind: 'working', label: 'checking' });
    try {
      const preview = await previewRosterImport(rows.map((entry) => entry.row));
      setStage({ kind: 'review', rows, preview });
    } catch (error) {
      if (error instanceof RosterError && error.code === 'validation' && Array.isArray(error.details)) {
        setStage({ kind: 'invalid', issues: error.details as RosterValidationIssue[] });
      } else {
        setStage({ kind: 'error', reason: 'failed' });
      }
    }
  };

  const runImport = async (rows: RosterFileRow[], rankId: string | null) => {
    setStage({ kind: 'importing', rows, done: 0 });
    try {
      const result = await commitRosterImport(rows.map((entry) => ({ ...entry.row, customRankId: rankId })));
      const accounts = await provisionRosterAccounts(rows, (done) =>
        setStage((current) => (current.kind === 'importing' ? { ...current, done } : current))
      );
      await queryClient.invalidateQueries({ queryKey: ['roster'] });
      await queryClient.invalidateQueries({ queryKey: ['ranks'] });
      setStage({ kind: 'done', result, accounts, total: rows.length });
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['roster'] });
      setStage({ kind: 'error', reason: 'failed' });
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void checkFile(file);
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      size="lg"
      title={t('roster.import.title')}
      description={t('roster.import.description')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFileChange}
      />
      {stage.kind === 'choose' && <ChooseStep onPick={() => inputRef.current?.click()} />}
      {stage.kind === 'working' && (
        <p role="status" className="py-8 text-center text-sm text-neutral-600">
          {t(`roster.import.working.${stage.label}`)}
        </p>
      )}
      {stage.kind === 'review' && (
        <ReviewStep
          rows={stage.rows}
          preview={stage.preview}
          ranks={ranks}
          onImport={(selectedRows, rankId) => void runImport(selectedRows, rankId)}
          onChooseAnother={() => inputRef.current?.click()}
        />
      )}
      {stage.kind === 'invalid' && (
        <InvalidStep issues={stage.issues} onChooseAnother={() => inputRef.current?.click()} />
      )}
      {stage.kind === 'importing' && (
        <p role="status" className="py-8 text-center text-sm text-neutral-600">
          {stage.done === 0
            ? t('roster.import.importing')
            : t('roster.import.accountProgress', { done: stage.done, total: stage.rows.length })}
        </p>
      )}
      {stage.kind === 'done' && (
        <DoneStep
          result={stage.result}
          accounts={stage.accounts}
          onClose={() => handleOpenChange(false)}
        />
      )}
      {stage.kind === 'error' && (
        <div className="flex flex-col gap-4">
          <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
            {t(`roster.import.errors.${stage.reason}`)}
          </p>
          <Button variant="secondary" onClick={() => inputRef.current?.click()} className="w-full sm:w-auto">
            {t('roster.import.chooseAnother')}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function formatIssue(t: TFunction, issue: RosterValidationIssue): string {
  const message = t(`roster.import.issues.${issue.code}`, { defaultValue: issue.code });
  return t('roster.import.issue', { line: issue.line, code: message });
}

function ChooseStep({ onPick }: { onPick: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 text-success-700">
        <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="max-w-sm text-sm text-neutral-600">{t('roster.import.chooseHint')}</p>
      <Button onClick={onPick}>{t('roster.import.chooseFile')}</Button>
    </div>
  );
}

function ReviewStep({
  rows,
  preview,
  ranks,
  onImport,
  onChooseAnother,
}: {
  rows: RosterFileRow[];
  preview: RosterImportPreview;
  ranks: { id: string; name: string; nameAr: string | null }[];
  onImport: (selectedRows: RosterFileRow[], rankId: string | null) => void;
  onChooseAnother: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(new Set(rows.map((r) => r.row.line)));
  const [rankId, setRankId] = useState<string>('');

  const allSelected = selected.size === rows.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.row.line)));
  };
  const toggleOne = (line: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const selectedRows = rows.filter((r) => selected.has(r.row.line));

  const handleImport = () => {
    if (selectedRows.length === 0) return;
    onImport(selectedRows, rankId || null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('roster.import.total')} value={rows.length} />
        <Stat label={t('roster.import.toAdd')} value={preview.toCreate} />
        <Stat label={t('roster.import.toUpdate')} value={preview.toUpdate} />
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-medium text-primary-900 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-neutral-300 text-accent-600 focus:ring-accent-500"
          />
          {t('roster.import.selectAll')}
        </label>
        <span className="text-xs text-neutral-500">
          {t('roster.import.selectedCount', { count: selected.size })}
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-xl border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-100 text-sm">
          <tbody className="divide-y divide-neutral-100">
            {rows.map((entry) => {
              const isChecked = selected.has(entry.row.line);
              return (
                <tr
                  key={entry.row.line}
                  className={`cursor-pointer transition-colors hover:bg-neutral-50 ${isChecked ? 'bg-accent-50/40' : ''}`}
                  onClick={() => toggleOne(entry.row.line)}
                >
                  <td className="w-10 px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(entry.row.line)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-neutral-300 text-accent-600 focus:ring-accent-500"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="font-medium text-primary-900" dir="auto">{entry.row.fullNameEn}</span>
                      {entry.row.fullNameAr && (
                        <span className="text-xs text-neutral-500" dir="auto">{entry.row.fullNameAr}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-600" dir="ltr">{entry.row.email}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-neutral-600" dir="ltr">{entry.row.userId}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="text-sm font-medium text-primary-900">{t('roster.import.assignRank')}</label>
        <select
          value={rankId}
          onChange={(e) => setRankId(e.target.value)}
          className={`${inputClass} flex-1`}
        >
          <option value="">{t('roster.import.noRank')}</option>
          {ranks.map((rank) => (
            <option key={rank.id} value={rank.id}>
              {rank.nameAr ?? rank.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-neutral-600">{t('roster.import.passwordNote')}</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onChooseAnother} className="w-full sm:w-auto">
          {t('roster.import.chooseAnother')}
        </Button>
        <Button onClick={handleImport} disabled={selectedRows.length === 0} className="w-full sm:w-auto">
          <Upload className="h-4 w-4" aria-hidden="true" />
          {t('roster.import.commit', { count: selectedRows.length })}
        </Button>
      </div>
    </div>
  );
}

function InvalidStep({ issues, onChooseAnother }: { issues: RosterValidationIssue[]; onChooseAnother: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
        {t('roster.import.invalidIntro', { count: issues.length })}
      </p>
      <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto text-sm text-neutral-700">
        {issues.slice(0, MAX_LISTED_ISSUES).map((issue, index) => (
          <li key={`${issue.line}-${issue.code}-${index}`} className="rounded-lg bg-neutral-50 px-3 py-2">
            {formatIssue(t, issue)}
          </li>
        ))}
      </ul>
      <Button variant="secondary" onClick={onChooseAnother} className="w-full sm:w-auto">
        {t('roster.import.chooseAnother')}
      </Button>
    </div>
  );
}

function DoneStep({
  result,
  accounts,
  onClose,
}: {
  result: RosterImportResult;
  accounts: ProvisionReport;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
        <Check className="h-4 w-4" aria-hidden="true" />
        {t('roster.import.done', { created: result.created, updated: result.updated })}
      </p>
      <p className="text-sm text-neutral-700">
        {t('roster.import.accounts', { created: accounts.created, existing: accounts.existing })}
      </p>
      {accounts.failedLines.length > 0 && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700">
          <p>{t('roster.import.accountsFailed', { lines: accounts.failedLines.join(', ') })}</p>
          {accounts.firstErrorCode && (
            <p className="font-medium">
              {t('roster.import.accountErrorReason', {
                defaultValue: '',
                reason: t(
                  `roster.import.accountErrors.${accounts.firstErrorCode}`,
                  { defaultValue: accounts.firstErrorCode }
                ),
              })}
            </p>
          )}
        </div>
      )}
      <Button onClick={onClose} className="w-full sm:w-auto sm:self-end">
        {t('common.close')}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
      <p className="text-2xl font-semibold text-primary-900">{value}</p>
      <p className="text-xs text-neutral-600">{label}</p>
    </div>
  );
}
