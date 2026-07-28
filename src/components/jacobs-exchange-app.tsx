"use client";

import { useEffect, useMemo, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

type TabKey = "calculator" | "history";

type Draft = {
  operationId: string;
  cnyAmount: string;
  usdtRubRate: string;
  costPerCny: string;
  clientRate: string;
  comment: string;
};

type Deal = {
  id: string;
  operationId: string;
  createdAt: string;
  cnyAmount: number;
  usdtRubRate: number;
  costPerCny: number;
  clientRate: number;
  comment: string;
  clientPays: number;
  boughtUsdt: number;
  neededUsdt: number;
  remainingUsdt: number;
  profitRub: number;
};

type StoredState = {
  draft: Draft;
  history: Deal[];
};

const STORAGE_KEY = "jacobs-exchange-state-v1";

const DEFAULT_DRAFT: Draft = {
  operationId: "",
  cnyAmount: "2000",
  usdtRubRate: "80.00",
  costPerCny: "12.1212",
  clientRate: "12.5000",
  comment: "",
};

const numberFormatter = (fractionDigits: number) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const formatRub = (value: number, digits = 2) => `${numberFormatter(digits).format(value)} ₽`;
const formatUsdt = (value: number, digits = 6) => numberFormatter(digits).format(value);
const formatCny = (value: number, digits = 2) => numberFormatter(digits).format(value);
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseNumber = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const generateOperationId = () => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${`${now.getMonth() + 1}`.padStart(2, "0")}${`${now.getDate()}`.padStart(2, "0")}`;
  const timePart = `${`${now.getHours()}`.padStart(2, "0")}${`${now.getMinutes()}`.padStart(2, "0")}${`${now.getSeconds()}`.padStart(2, "0")}`;
  const randomPart = Math.floor(Math.random() * 900 + 100);
  return `JEX-${datePart}-${timePart}-${randomPart}`;
};

const loadState = (): StoredState | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      draft: { ...DEFAULT_DRAFT, ...(parsed.draft ?? {}) },
      history: Array.isArray(parsed.history) ? (parsed.history as Deal[]) : [],
    };
  } catch {
    return null;
  }
};

const saveState = (state: StoredState) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures to keep the app usable offline.
  }
};

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 shadow-[0_1px_0_rgba(255,255,255,0.02)]">
      <p className="text-xs uppercase tracking-[0.16em] text-[#888888]">{label}</p>
      <div className="mt-3 text-2xl font-semibold text-white tabular-nums">{value}</div>
      <p className="mt-2 text-sm text-[#888888]">{helper}</p>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  suffix,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  suffix?: string;
  help?: string;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-medium text-white">{label}</span>
        {suffix ? <span className="text-xs text-[#888888]">{suffix}</span> : null}
      </div>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#333333] bg-[#0a0a0a] px-4 py-3 text-base text-white outline-none transition placeholder:text-[#555555] focus:border-white/40"
      />
      {help ? <p className="text-xs leading-5 text-[#888888]">{help}</p> : null}
    </label>
  );
}

function PillButton({
  children,
  onClick,
  active = false,
  variant = "default",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  variant?: "default" | "ghost" | "danger";
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition";
  const styles =
    variant === "danger"
      ? "border-[#4b2f2f] bg-[#1a1010] text-[#f3f3f3] hover:bg-[#241414]"
      : variant === "ghost"
        ? "border-[#2a2a2a] bg-transparent text-[#cfcfcf] hover:bg-white/5"
        : active
          ? "border-white bg-white text-black hover:bg-white/90"
          : "border-[#333333] bg-[#111111] text-white hover:bg-[#181818]";

  return (
    <button type={type} onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export default function JacobsExchangeApp() {
  const [activeTab, setActiveTab] = useState<TabKey>("calculator");
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [history, setHistory] = useState<Deal[]>([]);
  const [ready, setReady] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = loadState();
    if (stored) {
      setDraft(stored.draft);
      setHistory(stored.history);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState({ draft, history });
  }, [draft, history, ready]);

  const numbers = useMemo(
    () => ({
      cnyAmount: parseNumber(draft.cnyAmount),
      usdtRubRate: parseNumber(draft.usdtRubRate),
      costPerCny: parseNumber(draft.costPerCny),
      clientRate: parseNumber(draft.clientRate),
    }),
    [draft.cnyAmount, draft.usdtRubRate, draft.costPerCny, draft.clientRate],
  );

  const calculations = useMemo(() => {
    const clientPays = numbers.cnyAmount * numbers.clientRate;
    const boughtUsdt = numbers.usdtRubRate > 0 ? clientPays / numbers.usdtRubRate : 0;
    const neededUsdt = numbers.usdtRubRate > 0 ? (numbers.cnyAmount * numbers.costPerCny) / numbers.usdtRubRate : 0;
    const remainingUsdt = boughtUsdt - neededUsdt;
    const profitRub = (numbers.clientRate - numbers.costPerCny) * numbers.cnyAmount;

    return {
      clientPays,
      boughtUsdt,
      neededUsdt,
      remainingUsdt,
      profitRub,
    };
  }, [numbers]);

  const canSave =
    numbers.cnyAmount > 0 && numbers.usdtRubRate > 0 && numbers.costPerCny > 0 && numbers.clientRate > 0;

  const todayKey = localDateKey(new Date());
  const allTimeTotals = useMemo(() => {
    return history.reduce(
      (acc, deal) => {
        acc.turnoverCny += deal.cnyAmount;
        acc.profitRub += deal.profitRub;
        if (localDateKey(new Date(deal.createdAt)) === todayKey) {
          acc.todayDeals += 1;
          acc.todayTurnoverCny += deal.cnyAmount;
          acc.todayProfitRub += deal.profitRub;
        }
        return acc;
      },
      { turnoverCny: 0, profitRub: 0, todayDeals: 0, todayTurnoverCny: 0, todayProfitRub: 0 },
    );
  }, [history, todayKey]);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return history.filter((deal) => {
      const dealDate = localDateKey(new Date(deal.createdAt));
      const matchesQuery =
        !query ||
        [deal.operationId, deal.comment, `${deal.cnyAmount}`, `${deal.profitRub}`, `${deal.clientRate}`]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesFrom = !dateFrom || dealDate >= dateFrom;
      const matchesTo = !dateTo || dealDate <= dateTo;
      return matchesQuery && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, history, searchQuery]);

  const saveDeal = () => {
    if (!canSave) {
      setNotice("Заполните все числовые поля положительными значениями.");
      setActiveTab("calculator");
      return;
    }

    const operationId = draft.operationId.trim() || generateOperationId();
    const createdAt = new Date().toISOString();
    const deal: Deal = {
      id: crypto.randomUUID(),
      operationId,
      createdAt,
      cnyAmount: numbers.cnyAmount,
      usdtRubRate: numbers.usdtRubRate,
      costPerCny: numbers.costPerCny,
      clientRate: numbers.clientRate,
      comment: draft.comment.trim(),
      clientPays: calculations.clientPays,
      boughtUsdt: calculations.boughtUsdt,
      neededUsdt: calculations.neededUsdt,
      remainingUsdt: calculations.remainingUsdt,
      profitRub: calculations.profitRub,
    };

    setHistory((current) => [deal, ...current]);
    setDraft((current) => ({ ...current, operationId }));
    setExpandedId(deal.id);
    setNotice(`Сделка ${operationId} сохранена.`);
    setActiveTab("history");
  };

  const resetDraft = () => {
    setDraft(DEFAULT_DRAFT);
    setNotice("Поля калькулятора сброшены.");
  };

  const fillQuickAmount = (amount: number) => {
    setDraft((current) => ({ ...current, cnyAmount: `${amount}` }));
  };

  const exportHistory = () => {
    const payload = JSON.stringify(history, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jacobs_exchange_history_${localDateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("История экспортирована в JSON.");
  };

  const clearHistory = () => {
    if (!window.confirm("Удалить всю историю сделок? Это действие нельзя отменить.")) {
      return;
    }

    setHistory([]);
    setExpandedId(null);
    setNotice("История очищена.");
  };

  const summaryCards = [
    {
      label: "Клиент платит",
      value: formatRub(calculations.clientPays),
      helper: `${formatCny(numbers.cnyAmount, 2)} × ${formatCny(numbers.clientRate, 4)}`,
    },
    {
      label: "Куплено USDT",
      value: formatUsdt(calculations.boughtUsdt),
      helper: `${formatRub(calculations.clientPays)} ÷ ${formatRub(numbers.usdtRubRate, 2)}`,
    },
    {
      label: "Нужно USDT",
      value: formatUsdt(calculations.neededUsdt),
      helper: `${formatCny(numbers.cnyAmount, 2)} × ${formatCny(numbers.costPerCny, 4)} ÷ ${formatRub(numbers.usdtRubRate, 2)}`,
    },
    {
      label: "Остаток USDT",
      value: formatUsdt(calculations.remainingUsdt),
      helper: `${formatUsdt(calculations.boughtUsdt)} − ${formatUsdt(calculations.neededUsdt)}`,
    },
    {
      label: "Прибыль",
      value: formatRub(calculations.profitRub),
      helper: `(${formatCny(numbers.clientRate, 4)} − ${formatCny(numbers.costPerCny, 4)}) × ${formatCny(numbers.cnyAmount, 2)}`,
    },
    {
      label: "Себестоимость 1 CNY",
      value: formatRub(numbers.costPerCny, 4),
      helper: "Ручная корректировка доступна всегда.",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-6 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-[#2a2a2a] bg-[#0b0b0b] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#111111] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#888888]">
                Jacob&apos;s Exchange · local storage MVP
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Калькулятор обменного пункта</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9a9a9a] sm:text-base">
                  Быстрый расчет сделки: CNY клиенту, покупка USDT, расчет остатка, прибыли и сохранение истории
                  операций на устройстве.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PillButton active={activeTab === "calculator"} onClick={() => setActiveTab("calculator")}>
                  Калькулятор
                </PillButton>
                <PillButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
                  История
                </PillButton>
                <PillButton variant="ghost" onClick={exportHistory}>
                  Экспорт JSON
                </PillButton>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[24rem] lg:grid-cols-1">
              <MetricCard
                label="Сделок сегодня"
                value={`${allTimeTotals.todayDeals}`}
                helper={`Оборот: ${formatCny(allTimeTotals.todayTurnoverCny, 2)} CNY · Прибыль: ${formatRub(
                  allTimeTotals.todayProfitRub,
                )}`}
              />
              <MetricCard
                label="Всего сделок"
                value={`${history.length}`}
                helper={`Оборот: ${formatCny(allTimeTotals.turnoverCny, 2)} CNY`}
              />
              <MetricCard
                label="Общая прибыль"
                value={formatRub(allTimeTotals.profitRub)}
                helper="По сохраненной истории на этом устройстве."
              />
            </div>
          </div>

          {notice ? (
            <div className="mt-5 rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 text-sm text-[#d7d7d7]">
              {notice}
            </div>
          ) : null}
        </section>

        {activeTab === "calculator" ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 rounded-[2rem] border border-[#2a2a2a] bg-[#0d0d0d] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Ввод данных</h2>
                  <p className="mt-1 text-sm text-[#888888]">Все значения обновляются автоматически.</p>
                </div>
                <PillButton variant="ghost" onClick={resetDraft}>
                  Сбросить
                </PillButton>
              </div>

              <div className="grid gap-4">
                <Field
                  label="Номер сделки / ID операции"
                  value={draft.operationId}
                  onChange={(value) => setDraft((current) => ({ ...current, operationId: value }))}
                  placeholder="Будет создан автоматически"
                  suffix="по нему удобно искать сделку"
                />
                <Field
                  label="Количество CNY клиенту"
                  value={draft.cnyAmount}
                  onChange={(value) => setDraft((current) => ({ ...current, cnyAmount: value }))}
                  placeholder="2000"
                  type="number"
                  inputMode="decimal"
                  help="Сумма в юанях, которую покупает клиент."
                />
                <div className="flex flex-wrap gap-2">
                  {[1000, 2000, 5000, 10000].map((amount) => (
                    <PillButton key={amount} variant="ghost" onClick={() => fillQuickAmount(amount)}>
                      {amount} CNY
                    </PillButton>
                  ))}
                </div>
                <Field
                  label="Курс USDT/RUB"
                  value={draft.usdtRubRate}
                  onChange={(value) => setDraft((current) => ({ ...current, usdtRubRate: value }))}
                  placeholder="80.00"
                  type="number"
                  inputMode="decimal"
                  help="Цена покупки USDT за рубли."
                />
                <Field
                  label="Себестоимость 1 CNY"
                  value={draft.costPerCny}
                  onChange={(value) => setDraft((current) => ({ ...current, costPerCny: value }))}
                  placeholder="12.1212"
                  type="number"
                  inputMode="decimal"
                  help="Можно оставить расчетную величину или отредактировать вручную."
                />
                <Field
                  label="Курс клиенту"
                  value={draft.clientRate}
                  onChange={(value) => setDraft((current) => ({ ...current, clientRate: value }))}
                  placeholder="12.5000"
                  type="number"
                  inputMode="decimal"
                  help="Цена продажи CNY клиенту."
                />
                <Field
                  label="Комментарий"
                  value={draft.comment}
                  onChange={(value) => setDraft((current) => ({ ...current, comment: value }))}
                  placeholder="Клиент Иван · СБП"
                  help="ФИО клиента, банк, примечания и любые детали сделки."
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <PillButton onClick={saveDeal}>Сохранить сделку</PillButton>
                <PillButton variant="ghost" onClick={() => setDraft((current) => ({ ...current, operationId: generateOperationId() }))}>
                  Сгенерировать ID
                </PillButton>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-[#2a2a2a] bg-[#0d0d0d] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Расчеты</h2>
                    <p className="mt-1 text-sm text-[#888888]">Формулы обновляются при каждом изменении поля.</p>
                  </div>
                  <div className="text-right text-xs text-[#888888]">
                    <div>Статус</div>
                    <div className="mt-1 text-sm text-white">{canSave ? "Готово к сохранению" : "Проверьте поля"}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {summaryCards.map((card) => (
                    <MetricCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#2a2a2a] bg-[#0d0d0d] p-5 sm:p-6">
                <h3 className="text-lg font-semibold">Подсказка</h3>
                <p className="mt-3 text-sm leading-6 text-[#9a9a9a]">
                  Приложение работает офлайн в браузере. История и текущие поля сохраняются в localStorage, поэтому
                  данные остаются после закрытия окна.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-5 rounded-[2rem] border border-[#2a2a2a] bg-[#0d0d0d] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">История сделок</h2>
                <p className="mt-1 text-sm text-[#888888]">Поиск по ID, комментарию, сумме и прибыли.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <PillButton variant="ghost" onClick={clearHistory}>
                  Очистить историю
                </PillButton>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <label className="block space-y-2 lg:col-span-2">
                <span className="text-sm font-medium text-white">Поиск</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ID, комментарий, сумма, прибыль"
                  className="w-full rounded-2xl border border-[#333333] bg-[#0a0a0a] px-4 py-3 text-base text-white outline-none transition placeholder:text-[#555555] focus:border-white/40"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white">С</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="w-full rounded-2xl border border-[#333333] bg-[#0a0a0a] px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white">По</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="w-full rounded-2xl border border-[#333333] bg-[#0a0a0a] px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#333333] bg-[#0a0a0a] p-8 text-center text-sm text-[#888888]">
                  Пока нет сохраненных сделок. Перейдите в калькулятор и сохраните первую операцию.
                </div>
              ) : (
                filteredHistory.map((deal) => {
                  const expanded = expandedId === deal.id;
                  return (
                    <article
                      key={deal.id}
                      className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 transition hover:border-[#3a3a3a]"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : deal.id)}
                        className="w-full text-left"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm text-[#888888]">{formatDateTime(deal.createdAt)}</p>
                            <h3 className="mt-1 text-lg font-semibold">{deal.operationId}</h3>
                            <p className="mt-1 text-sm text-[#9a9a9a]">{deal.cnyAmount} CNY</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-xs uppercase tracking-[0.16em] text-[#888888]">Прибыль</p>
                            <p className="mt-1 text-xl font-semibold text-white">{formatRub(deal.profitRub)}</p>
                            <p className="mt-1 text-sm text-[#9a9a9a]">ID сделки</p>
                          </div>
                        </div>
                      </button>

                      {expanded ? (
                        <div className="mt-4 grid gap-4 border-t border-[#2a2a2a] pt-4 lg:grid-cols-[1fr_auto]">
                          <div className="grid gap-3 text-sm text-[#d7d7d7] sm:grid-cols-2">
                            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
                              <div className="text-[#888888]">Количество CNY</div>
                              <div className="mt-1 text-base text-white">{formatCny(deal.cnyAmount, 2)} CNY</div>
                            </div>
                            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
                              <div className="text-[#888888]">Курс USDT/RUB</div>
                              <div className="mt-1 text-base text-white">{formatRub(deal.usdtRubRate, 2)}</div>
                            </div>
                            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
                              <div className="text-[#888888]">Себестоимость 1 CNY</div>
                              <div className="mt-1 text-base text-white">{formatRub(deal.costPerCny, 4)}</div>
                            </div>
                            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
                              <div className="text-[#888888]">Курс клиенту</div>
                              <div className="mt-1 text-base text-white">{formatRub(deal.clientRate, 4)}</div>
                            </div>
                            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
                              <div className="text-[#888888]">Клиент заплатил</div>
                              <div className="mt-1 text-base text-white">{formatRub(deal.clientPays)}</div>
                            </div>
                            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
                              <div className="text-[#888888]">Куплено USDT</div>
                              <div className="mt-1 text-base text-white">{formatUsdt(deal.boughtUsdt)}</div>
                            </div>
                            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
                              <div className="text-[#888888]">Использовано USDT</div>
                              <div className="mt-1 text-base text-white">{formatUsdt(deal.neededUsdt)}</div>
                            </div>
                            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
                              <div className="text-[#888888]">Остаток USDT</div>
                              <div className="mt-1 text-base text-white">{formatUsdt(deal.remainingUsdt)}</div>
                            </div>
                          </div>

                          <div className="flex flex-col justify-between gap-3 lg:w-52">
                            <div className="rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] p-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-[#888888]">Комментарий</div>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white">
                                {deal.comment || "Комментарий не указан."}
                              </p>
                            </div>
                            <PillButton
                              variant="danger"
                              onClick={() => {
                                if (!window.confirm(`Удалить сделку ${deal.operationId}?`)) return;
                                setHistory((current) => current.filter((item) => item.id !== deal.id));
                                setExpandedId((current) => (current === deal.id ? null : current));
                                setNotice(`Сделка ${deal.operationId} удалена.`);
                              }}
                            >
                              Удалить
                            </PillButton>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-[#2a2a2a] bg-black/92 backdrop-blur supports-[backdrop-filter]:bg-black/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
              activeTab === "calculator"
                ? "border-white bg-white text-black"
                : "border-[#2a2a2a] bg-[#111111] text-white"
            }`}
          >
            Калькулятор
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
              activeTab === "history"
                ? "border-white bg-white text-black"
                : "border-[#2a2a2a] bg-[#111111] text-white"
            }`}
          >
            История
          </button>
        </div>
      </nav>
    </main>
  );
}
