'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ClinicMark from '@/components/ClinicMark';
import styles from './admin.module.css';
import {
  Service,
  WorkingHour,
  DayOff,
  Appointment,
  ClinicSettings,
  AppointmentStatus,
  DayOfWeek,
} from '@/types/database';
import {
  getClinicSettings,
  updateClinicSettings,
  getServices,
  addService,
  updateService,
  deleteService,
  getWorkingHours,
  updateWorkingHour,
  getDaysOff,
  addDayOff,
  deleteDayOff,
  getAppointments,
  addAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  sendAppointmentReminder,
  syncWithSupabase,
} from '@/lib/storage';
import { formatBulgarianDate } from '@/lib/notifications';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  FileText,
  CheckCircle2,
  PlusCircle,
  Bell,
  Trash2,
  ExternalLink,
  LogOut,
  Lock,
  Building,
  CalendarOff,
  Check,
  Euro,
  Users,

  RotateCw,
  X,
  ArrowUpRight,
} from 'lucide-react';
import AdminHourlyCalendar from '@/components/AdminHourlyCalendar';

function ToothIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C8.5 2 6 4.5 6 8c0 3 1.2 5.5 2 8.5.8 3 1.5 5.5 4 5.5s3.2-2.5 4-5.5c.8-3 2-5.5 2-8.5 0-3.5-2.5-6-6-6z" />
      <path d="M9.5 9c.8-.8 1.6-1.2 2.5-1.2s1.7.4 2.5 1.2" />
    </svg>
  );
}

export default function AdminPage() {
  // Автентикация
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(null);

  // Табове: 'schedule' | 'services' | 'hours' | 'days_off' | 'settings'
  const [activeTab, setActiveTab] = useState<'schedule' | 'services' | 'hours' | 'days_off' | 'settings'>('schedule');

  // Данни
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Филтри за графика
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');

  // Интерактивен поп-ъп за KPI броячите (Днес, Предстоящи, Приключили, Оборот)
  const [activeKpiModal, setActiveKpiModal] = useState<'today' | 'upcoming' | 'completed' | 'revenue' | null>(null);

  // Модал за записване на час от лекарката (ръчно за пациент от телефона)
  const [isManualBookingOpen, setIsManualBookingOpen] = useState<boolean>(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualServiceId, setManualServiceId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState('10:00');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Модал / форма за нова услуга
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Обща стоматология');
  const [newServiceDuration, setNewServiceDuration] = useState<number>(30);
  const [newServicePrice, setNewServicePrice] = useState<number>(50);
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Форма за почивни дни
  const [newDayOffStart, setNewDayOffStart] = useState('');
  const [newDayOffEnd, setNewDayOffEnd] = useState('');
  const [newDayOffReason, setNewDayOffReason] = useState('');

  // Съобщение за успех / toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Проверка за автентикация (Supabase или демо сесия)
  useEffect(() => {
    async function checkAuth() {
      if (typeof window !== 'undefined') {
        const demoAuth = localStorage.getItem('dent_admin_authenticated');
        if (demoAuth === 'true') {
          setIsAuthenticated(true);
          setAdminUser({ email: 'dr.ayaz.dent@gmail.com', name: 'Д-р Джанел Аяз' });
        }
      }

      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsAuthenticated(true);
          setAdminUser({
            email: data.session.user.email || 'dr.ayaz.dent@gmail.com',
            name: data.session.user.user_metadata?.full_name || 'Д-р Джанел Аяз',
          });
        }
      }
    }
    checkAuth();
  }, []);

  // Зареждане на всички данни
  const fetchAllData = async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const [apts, srvs, hrs, doff, setts] = await Promise.all([
        getAppointments(),
        getServices(),
        getWorkingHours(),
        getDaysOff(),
        getClinicSettings(),
      ]);
      setAppointments(apts);
      setServices(srvs);
      setWorkingHours(hrs);
      setDaysOff(doff);
      setSettings(setts);
      if (srvs.length > 0 && !manualServiceId) {
        setManualServiceId(srvs[0].id);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData(true);

      const handleStorageUpdate = (e: StorageEvent) => {
        if (e.key && e.key.startsWith('dent_')) {
          fetchAllData(false);
        }
      };

      window.addEventListener('storage', handleStorageUpdate);
      const interval = setInterval(() => fetchAllData(false), 30000); // auto-sync new appointments silently every 30s

      return () => {
        window.removeEventListener('storage', handleStorageUpdate);
        clearInterval(interval);
      };
    }
  }, [isAuthenticated]);

  // Затваряне на KPI поп-ъп модала при натискане на Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveKpiModal(null);
      }
    };
    if (activeKpiModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeKpiModal]);

  // Google Вход
  const handleGoogleLogin = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined,
        },
      });
      if (error) {
        alert(`Грешка при Google вход: ${error.message}. Влизане в демо режим.`);
        handleDemoLogin();
      }
    } else {
      handleDemoLogin();
    }
  };

  const handleDemoLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dent_admin_authenticated', 'true');
    }
    setIsAuthenticated(true);
    setAdminUser({ email: 'dr.ayaz.dent@gmail.com', name: 'Д-р Джанел Аяз' });
    showToast('Добре дошли в админ панела, Д-р Аяз!');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dent_admin_authenticated');
    }
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  // Промяна на статус на час (мигновена реакция)
  const handleStatusChange = async (aptId: string, newStatus: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status: newStatus } : a))
    );
    showToast(`Статусът на часа е променен на "${newStatus === 'completed' ? 'Приключил' : newStatus === 'cancelled' ? 'Отменен' : 'Потвърден'}"`);
    await updateAppointmentStatus(aptId, newStatus);
  };

  // Изпращане на напомняне и копиране на съобщение за Viber/SMS
  const handleSendReminder = async (apt: Appointment) => {
    const res = await sendAppointmentReminder(apt.id);
    if (res.success) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, reminder_sent: true } : a))
      );
      const formattedTime = apt.start_time ? String(apt.start_time).slice(0, 5) : '';
      const reminderText = `Здравейте ${apt.patient_name}, напомняме Ви за Вашия час при Д-р Джанел Аяз на ${formatBulgarianDate(apt.date)} от ${formattedTime} ч. Кабинет: гр. Търговище, бул. „Васил Левски“ №12, тел. 088 812 3456.`;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(reminderText);
          showToast(`Часът е маркиран като напомнен и текстът е копиран за Viber/SMS!`);
          return;
        } catch {
          // ignore
        }
      }
      showToast(res.message);
    }
  };

  // Изтриване на час
  const handleDeleteAppointment = async (aptId: string, patientName: string) => {
    if (confirm(`Сигурни ли сте, че искате окончателно да изтриете часа за "${patientName}"?`)) {
      await deleteAppointment(aptId);
      setAppointments((prev) => prev.filter((a) => a.id !== aptId));
      showToast(`Часът за ${patientName} беше премахнат от графика.`);
    }
  };

  // Ръчно запазване на час от лекарката (телефон / на място)
  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim() || !manualServiceId || !manualDate || !manualTime) {
      alert('Моля, попълнете всички задължителни полета.');
      return;
    }

    setManualSubmitting(true);
    try {
      const selectedSrv = services.find((s) => s.id === manualServiceId) || services[0];
      const [h, m] = manualTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + selectedSrv.duration_minutes;
      const endH = Math.floor(totalMinutes / 60);
      const endM = totalMinutes % 60;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const newApt = await addAppointment({
        service_id: selectedSrv.id,
        service_title: selectedSrv.title,
        service_duration: selectedSrv.duration_minutes,
        service_price: selectedSrv.price_bgn,
        patient_name: manualName.trim(),
        patient_phone: manualPhone.trim(),
        patient_email: manualEmail.trim() || undefined,
        date: manualDate,
        start_time: manualTime,
        end_time: endTimeStr,
        status: 'confirmed',
        notes: manualNotes.trim() ? `[Записан от лекарката] ${manualNotes.trim()}` : '[Записан от лекарката по телефона]',
        booked_by: 'admin',
      });

      setAppointments((prev) => [newApt, ...prev]);
      setIsManualBookingOpen(false);
      setManualName('');
      setManualPhone('');
      setManualEmail('');
      setManualNotes('');
      showToast(`Успешно записан час за ${newApt.patient_name} на ${formatBulgarianDate(manualDate)} от ${manualTime} ч.!`);
    } catch (err) {
      console.error(err);
      alert('Възникна грешка при запазване на часа.');
    } finally {
      setManualSubmitting(false);
    }
  };

  // Добавяне на нова услуга
  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceTitle.trim() || newServiceDuration <= 0) return;

    const created = await addService({
      title: newServiceTitle.trim(),
      description: newServiceDesc.trim(),
      category: newServiceCategory,
      duration_minutes: Number(newServiceDuration),
      price_bgn: Number(newServicePrice),
      is_active: true,
      sort_order: services.length + 1,
    });

    setServices((prev) => [...prev, created]);
    setIsNewServiceOpen(false);
    setNewServiceTitle('');
    setNewServiceDesc('');
    showToast(`Услугата "${created.title}" е добавена успешно!`);
  };

  // Изтриване на услуга
  const handleDeleteService = async (id: string, title: string) => {
    if (confirm(`Сигурни ли сте, че искате да изтриете услугата "${title}"?`)) {
      await deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      showToast(`Услугата "${title}" беше изтрита.`);
    }
  };

  // Превключване на активност на услуга (мигновена реакция)
  const handleToggleServiceActive = async (service: Service) => {
    const nextActive = !service.is_active;
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_active: nextActive } : s))
    );
    showToast(`Услугата е ${nextActive ? 'активирана' : 'скрита'}.`);
    await updateService(service.id, { is_active: nextActive });
  };

  // Запазване на промени по работното време (мигновена реакция)
  const handleWorkingHourChange = async (
    dayOfWeek: DayOfWeek,
    field: keyof WorkingHour,
    value: WorkingHour[keyof WorkingHour] | null
  ) => {
    setWorkingHours((prev) =>
      prev.map((wh) => (wh.day_of_week === dayOfWeek ? { ...wh, [field]: value } : wh))
    );
    const dayItem = workingHours.find((w) => w.day_of_week === dayOfWeek);
    const dayName = dayItem ? dayItem.day_name : 'Денят';
    if (field === 'is_working') {
      showToast(value ? `${dayName} е активиран като работен ден.` : `${dayName} е отбелязан като почивен ден.`);
    } else {
      showToast(`Работното време за ${dayName} беше обновено.`);
    }
    await updateWorkingHour(dayOfWeek, { [field]: value });
  };

  // Обявяване на неработен ден / отпуск
  const handleAddDayOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayOffStart || !newDayOffEnd || !newDayOffReason.trim()) {
      alert('Моля, въведете начална дата, крайна дата и причина.');
      return;
    }

    const created = await addDayOff({
      start_date: newDayOffStart,
      end_date: newDayOffEnd,
      reason: newDayOffReason.trim(),
      is_full_day: true,
    });

    setDaysOff((prev) => [...prev, created]);
    setNewDayOffStart('');
    setNewDayOffEnd('');
    setNewDayOffReason('');
    showToast(`Обявен е неработен период: "${created.reason}"`);
  };

  const handleDeleteDayOff = async (id: string) => {
    await deleteDayOff(id);
    setDaysOff((prev) => prev.filter((d) => d.id !== id));
    showToast('Неработният период е премахнат и датите са отново отворени за записване.');
  };

  // Статистики за таблото
  const todayStr = new Date().toISOString().split('T')[0];

  // Брой активни часове по дати за календара
  const appointmentsByDate = appointments.reduce((acc, apt) => {
    if (apt.status !== 'cancelled') {
      acc[apt.date] = (acc[apt.date] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const todayAppointments = appointments.filter((a) => a.date === todayStr && a.status !== 'cancelled');
  const todayCount = todayAppointments.length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const totalUpcoming = appointments.filter((a) => a.date >= todayStr && a.status === 'confirmed').length;
  const todayRevenue = todayAppointments.reduce((sum, a) => sum + (a.service_price || 0), 0);

  // Списъци за интерактивния KPI поп-ъп
  const kpiTodayList = [...todayAppointments].sort((a, b) =>
    (a.start_time || '').localeCompare(b.start_time || '')
  );

  const kpiUpcomingList = appointments
    .filter((a) => a.date >= todayStr && a.status === 'confirmed')
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

  const kpiCompletedList = appointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.start_time || '').localeCompare(a.start_time || '');
    });

  const kpiRevenueCompleted = todayAppointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + (a.service_price || 0), 0);

  const kpiRevenuePending = todayAppointments
    .filter((a) => a.status === 'confirmed')
    .reduce((sum, a) => sum + (a.service_price || 0), 0);

  // ==========================================
  // АКО ПОТРЕБИТЕЛЯТ НЕ Е ЛОГНАТ -> ЕКРАН ЗА ВХОД
  // ==========================================
  if (!isAuthenticated) {
    return (
      <main className={styles.login}>
        <div className={styles.loginStory}><span className="eyebrow">Д-Р ДЖАНЕЛ АЯЗ · ДЕНТАЛНА ПРАКТИКА</span><ClinicMark /><h2>Повече време<br />за Вашите<br /><em>пациенти.</em></h2><p>График, услуги и организация на кабинета на едно място.</p><Link href="/">← Към уебсайта</Link></div>

        <div className={styles.loginCard}>

          <div className="w-12 h-12 rounded-xl bg-purple-800 text-white flex items-center justify-center mx-auto mb-5">
            <ClinicMark className="w-7 h-8" />
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            Д-р Джанел Аяз
          </h1>
          <p className="text-sm text-slate-500 mt-1 mb-8">
            Добре дошли в лекарския панел
          </p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-3 px-4 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Влез в графика</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-xl border border-gray-200 hover:border-purple-300 bg-white text-slate-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Вход с Google</span>
            </button>
          </div>

          <div className="mt-8 pt-5 border-t border-gray-100 text-xs text-slate-400">
            <Link href="/" className="text-purple-700 hover:text-purple-900 font-medium">
              ← Към уебсайта
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // ОСНОВЕН ИЗГЛЕД НА АДМИН ПАНЕЛА
  // ==========================================
  return (
    <div className={styles.dashboard}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-purple-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-purple-700/60 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className={styles.header}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={styles.headerRow}>
            
            {/* Brand */}
            <div className={`${styles.headerBrand} flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-lg bg-purple-800 flex items-center justify-center text-white">
                <ToothIcon className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-900 leading-tight">
                  {adminUser?.name || 'Д-р Джанел Аяз'}
                </span>
                <span className="block text-xs text-slate-500">
                  Лекарски панел
                </span>
              </div>
            </div>

            {/* Quick Actions & Logout with Clear Visual Priority */}
            <div className={styles.headerActions}>
              {/* PRIMARY ACTION: + Запиши час */}
              <button
                type="button"
                onClick={() => {
                  setManualDate(selectedDateFilter || todayStr);
                  setManualTime('10:00');
                  setIsManualBookingOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-800 hover:bg-purple-900 transition-colors active:scale-95 cursor-pointer"
                title="Запиши нов час за пациент"
              >
                <PlusCircle className="w-4 h-4 text-purple-200" />
                <span>Запиши час</span>
              </button>

              {/* SECONDARY UTILITY: Обнови & Синхронизирай */}
              <button
                type="button"
                onClick={async () => {
                  showToast('Синхронизиране с базата...');
                  const res = await syncWithSupabase();
                  await fetchAllData(false);
                  showToast(res.message);
                }}
                className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
                aria-label="Синхронизирай данните"
                title="Синхронизирай с облачната база данни"
              >
                <RotateCw className={`w-3.5 h-3.5 text-purple-700 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline text-[11px]">Синхронизирай</span>
              </button>

              {/* SECONDARY LINK: Към сайта */}
              <Link
                href="/"
                target="_blank"
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200/70 transition-colors"
                title="Отвори сайта в нов прозорец"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Към сайта</span>
              </Link>

              {/* QUIET LOGOUT: Изход */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50/70 transition-colors cursor-pointer"
                aria-label="Изход от системата"
                title="Изход от системата"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Изход</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={styles.content}>
        <div className={styles.pageHeading}><div><span className="eyebrow">ОРГАНИЗАЦИЯ НА КАБИНЕТА</span><h1>{({ schedule: 'Вашият график', services: 'Услуги и ценоразпис', hours: 'Работно време', days_off: 'Почивни дни и отпуски', settings: 'Настройки на кабинета' })[activeTab]}</h1><p>{({ schedule: 'Преглед на посещенията и грижата за Вашите пациенти.', services: 'Поддържайте услугите, цените и продължителността на процедурите.', hours: 'Определете кога кабинетът приема пациенти.', days_off: 'Планирайте периодите, в които няма да приемате пациенти.', settings: 'Информация за практиката и настройките за записване.' })[activeTab]}</p></div><span className={styles.dateBadge}><CalendarIcon size={17} />{formatBulgarianDate(todayStr)}</span></div>
        
        {/* Navigation Tabs (Modern Ergonomic Segmented Control) */}
        <nav aria-label="Раздели на лекарския панел" className={styles.tabs}>
          <button
            type="button"
            aria-current={activeTab === 'schedule' ? 'page' : undefined}
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-white/80'
            }`}
          >
            <CalendarIcon className={`w-4 h-4 ${activeTab === 'schedule' ? 'text-purple-200' : 'text-slate-500'}`} />
            <span>График & Пациенти</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === 'schedule' ? 'bg-white text-purple-900' : 'bg-slate-200 text-slate-700'
            }`}>
              {appointments.length}
            </span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'services' ? 'page' : undefined}
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-white/80'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'services' ? 'text-purple-200' : 'text-slate-500'}`} />
            <span>Услуги & Ценоразпис</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === 'services' ? 'bg-white text-purple-900' : 'bg-slate-200 text-slate-700'
            }`}>
              {services.length}
            </span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'hours' ? 'page' : undefined}
            onClick={() => setActiveTab('hours')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeTab === 'hours'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-white/80'
            }`}
          >
            <Clock className={`w-4 h-4 ${activeTab === 'hours' ? 'text-purple-200' : 'text-slate-500'}`} />
            <span>Работно време</span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'days_off' ? 'page' : undefined}
            onClick={() => setActiveTab('days_off')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeTab === 'days_off'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-white/80'
            }`}
          >
            <CalendarOff className={`w-4 h-4 ${activeTab === 'days_off' ? 'text-purple-200' : 'text-slate-500'}`} />
            <span>Почивни дни & Отпуски</span>
            {daysOff.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'days_off' ? 'bg-white text-purple-900' : 'bg-purple-100 text-purple-800'
              }`}>
                {daysOff.length}
              </span>
            )}
          </button>

          <button
            type="button"
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-white/80'
            }`}
          >
            <Building className={`w-4 h-4 ${activeTab === 'settings' ? 'text-purple-200' : 'text-slate-500'}`} />
            <span>Настройки на кабинета</span>
          </button>
        </nav>

        {/* ========================================================= */}
        {/* ТАБ 1: ГРАФИК И ЧАСОВЕ (SCHEDULE) */}
        {/* ========================================================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-5">
            {/* Контекстна лента за бърз преглед */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 sm:p-2 shadow-xs">
              <div className={styles.metrics}>
                
                {/* 1: Днес */}
                <button
                  type="button"
                  onClick={() => setActiveKpiModal('today')}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl hover:bg-purple-50/60 transition-all text-left flex items-center gap-2.5 cursor-pointer group"
                  title="Кликнете за списък с часовете за днес"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 group-hover:bg-purple-800 group-hover:text-white transition-colors">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">
                      Днес
                    </span>
                    <span className="text-sm font-bold text-slate-900 leading-tight">
                      {todayCount > 0 ? `${todayCount} записани` : 'Няма часове'}
                    </span>
                  </div>
                </button>

                {/* 2: Предстоящи */}
                <button
                  type="button"
                  onClick={() => setActiveKpiModal('upcoming')}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl hover:bg-purple-50/60 transition-all text-left flex items-center gap-2.5 cursor-pointer group border-t sm:border-t-0 sm:border-l border-slate-100"
                  title="Кликнете за преглед на предстоящите потвърдени часове"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-purple-800 group-hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">
                      Предстоящи
                    </span>
                    <span className="text-sm font-bold text-slate-900 leading-tight">
                      {totalUpcoming > 0 ? `${totalUpcoming} часа` : '0 предстоящи'}
                    </span>
                  </div>
                </button>

                {/* 3: Приключили */}
                <button
                  type="button"
                  onClick={() => setActiveKpiModal('completed')}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl hover:bg-emerald-50/60 transition-all text-left flex items-center gap-2.5 cursor-pointer group border-t lg:border-t-0 lg:border-l border-slate-100"
                  title="Кликнете за преглед на приключилите прегледи"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">
                      Приключили
                    </span>
                    <span className="text-sm font-bold text-emerald-800 leading-tight">
                      {completedCount > 0 ? `${completedCount} прегледа` : '0 приключили'}
                    </span>
                  </div>
                </button>

                {/* 4: Дневен оборот */}
                <button
                  type="button"
                  onClick={() => setActiveKpiModal('revenue')}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl hover:bg-purple-50/60 transition-all text-left flex items-center gap-2.5 cursor-pointer group border-t sm:border-t-0 sm:border-l border-slate-100"
                  title="Кликнете за финансова разбивка на оборота"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center shrink-0 group-hover:bg-purple-800 group-hover:text-white transition-colors">
                    <Euro className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">
                      Дневен оборот
                    </span>
                    <span className="text-sm font-bold text-purple-950 leading-tight">
                      {todayRevenue} €
                    </span>
                  </div>
                </button>

              </div>
            </div>

            {/* Единен интерактивен график по часове за телефон и компютър */}
            {isLoading && appointments.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-6 animate-pulse">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="h-6 bg-slate-200 rounded-lg w-48" />
                  <div className="flex gap-2">
                    <div className="h-8 bg-slate-200 rounded-xl w-24" />
                    <div className="h-8 bg-slate-200 rounded-xl w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-28 bg-slate-100 rounded-2xl p-3 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-10" />
                      <div className="h-10 bg-slate-200/60 rounded-xl w-full" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3 pt-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
                  ))}
                </div>
              </div>
            ) : (
              <AdminHourlyCalendar
                selectedDate={selectedDateFilter || todayStr}
                onSelectDate={(d) => setSelectedDateFilter(d)}
                appointments={appointments}
                appointmentsByDate={appointmentsByDate}
                daysOff={daysOff}
                onStatusChange={handleStatusChange}
                onSendReminder={handleSendReminder}
                onDeleteAppointment={handleDeleteAppointment}
                onNewAppointmentAt={(dateStr, timeStr) => {
                  setManualDate(dateStr);
                  setManualTime(timeStr);
                  setIsManualBookingOpen(true);
                }}
              />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ТАБ 2: ДЕНТАЛНИ УСЛУГИ (SERVICES MANAGEMENT) */}
        {/* ========================================================= */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Управление на услуги & ценоразпис ({services.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Промените по услугите се визуализират директно в сайта и формата за онлайн записване.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewServiceOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Добави нова процедура</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between ${
                    service.is_active
                      ? 'border-slate-200/90 shadow-xs hover:border-purple-300 hover:shadow-md'
                      : 'border-slate-200 bg-slate-50/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-100">
                        {service.category || 'Стоматология'}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        <span>~{service.duration_minutes} мин.</span>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base leading-snug">
                      {service.title}
                    </h4>

                    {service.description && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Цена</span>
                      <span className="text-lg font-extrabold text-slate-900">
                        {service.price_bgn} €
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleServiceActive(service)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                          service.is_active
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {service.is_active ? 'Скрий' : 'Активирай'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteService(service.id, service.title)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Изтрий услуга"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ТАБ 3: РАБОТНО ВРЕМЕ (WORKING HOURS) */}
        {/* ========================================================= */}
        {activeTab === 'hours' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-lg font-bold text-slate-900">
                Седмично работно време на кабинета
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Задайте работен интервал и обедна почивка по дни от седмицата. Системата автоматично отваря свободни часове само в тези граници.
              </p>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="divide-y divide-slate-100">
                {workingHours.map((wh) => (
                  <div
                    key={wh.day_of_week}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors"
                  >
                    {/* Day name & toggle switch */}
                    <div className="flex items-center gap-3 w-52 shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={wh.is_working}
                        onClick={() =>
                          handleWorkingHourChange(wh.day_of_week, 'is_working', !wh.is_working)
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          wh.is_working ? 'bg-purple-800' : 'bg-slate-200'
                        }`}
                        title={wh.is_working ? 'Кликнете за почивен ден' : 'Кликнете за работен ден'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            wh.is_working ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleWorkingHourChange(wh.day_of_week, 'is_working', !wh.is_working)
                        }
                        className="font-bold text-sm text-slate-900 cursor-pointer select-none hover:text-purple-800 transition-colors text-left"
                      >
                        {wh.day_name}
                      </button>
                    </div>

                    {wh.is_working ? (
                      <div className="flex flex-wrap items-center gap-5 text-xs">
                        {/* Start and End Time */}
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Работна смяна:</span>
                          <input
                            type="time"
                            value={(wh.start_time || '09:00').slice(0, 5)}
                            onChange={(e) =>
                              handleWorkingHourChange(wh.day_of_week, 'start_time', e.target.value)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                          />
                          <span className="text-slate-400">—</span>
                          <input
                            type="time"
                            value={(wh.end_time || '18:00').slice(0, 5)}
                            onChange={(e) =>
                              handleWorkingHourChange(wh.day_of_week, 'end_time', e.target.value)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                          />
                        </div>

                        {/* Break Times */}
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Обедна почивка:</span>
                          <input
                            type="time"
                            value={wh.break_start ? wh.break_start.slice(0, 5) : ''}
                            onChange={(e) =>
                              handleWorkingHourChange(wh.day_of_week, 'break_start', e.target.value || null)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white text-slate-900"
                          />
                          <span className="text-slate-400">—</span>
                          <input
                            type="time"
                            value={wh.break_end ? wh.break_end.slice(0, 5) : ''}
                            onChange={(e) =>
                              handleWorkingHourChange(wh.day_of_week, 'break_end', e.target.value || null)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white text-slate-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">
                        Почивен ден за д-р Аяз (не се записват часове)
                      </span>
                    )}

                    <div className="text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() =>
                          handleWorkingHourChange(wh.day_of_week, 'is_working', !wh.is_working)
                        }
                        className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                          wh.is_working
                            ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                        }`}
                        title="Кликнете за смяна на статуса"
                      >
                        {wh.is_working
                          ? `Работи (${(wh.start_time || '09:00').slice(0, 5)} - ${(wh.end_time || '18:00').slice(0, 5)})`
                          : 'Почивен ден'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ТАБ 4: ПОЧИВНИ ДНИ & ОТПУСКИ (DAYS OFF) */}
        {/* ========================================================= */}
        {activeTab === 'days_off' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-lg font-bold text-slate-900">
                Обявяване на почивни дни, отпуск или конференции
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Когато въведете отпуск или почивен период, системата блокира записването на часове за тези дати.
              </p>
            </div>

            {/* Form to declare day off */}
            <form
              onSubmit={handleAddDayOffSubmit}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4"
            >
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-purple-700" />
                <span>+ Добави нов неработен период</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Начална дата *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDayOffStart}
                    onChange={(e) => setNewDayOffStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Крайна дата *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDayOffEnd}
                    onChange={(e) => setNewDayOffEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Причина / Заглавие *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDayOffReason}
                    onChange={(e) => setNewDayOffReason(e.target.value)}
                    placeholder="напр. Годишен отпуск, Стоматологичен конгрес"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                Обяви неработен период
              </button>
            </form>

            {/* List of Days Off */}
            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Всички обявени периоди</span>
                <span className="text-xs text-slate-500 font-semibold">{daysOff.length} активни</span>
              </div>

              {daysOff.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-1">
                  <CalendarOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Няма обявени отпуски</p>
                  <p>Кабинетът работи според стандартното седмично разписание.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {daysOff.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                          <CalendarOff className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-900 text-sm">
                            {item.reason}
                          </span>
                          <span className="block text-xs text-purple-800 font-semibold mt-0.5">
                            {formatBulgarianDate(item.start_date)} — {formatBulgarianDate(item.end_date)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDayOff(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Премахни неработен период"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ТАБ 5: НАСТРОЙКИ НА КАБИНЕТА (CLINIC SETTINGS) */}
        {/* ========================================================= */}
        {activeTab === 'settings' && settings && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-lg font-bold text-slate-900">
                Настройки на стоматологичния кабинет
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Информацията за лекуващия лекар и контактите се изписва на сайта и в текстовите напомняния за пациенти.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Име на лекуващия лекар
                </label>
                <input
                  type="text"
                  value={settings.doctor_name}
                  onChange={(e) => setSettings({ ...settings, doctor_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Точен адрес на кабинета в Търговище
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Телефон за контакти
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Имейл адрес
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Време за напомняне преди часа (в часове)
                </label>
                <input
                  type="number"
                  value={settings.reminder_hours_before}
                  onChange={(e) =>
                    setSettings({ ...settings, reminder_hours_before: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Препоръчително: 24 часа преди часа за преглед.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await updateClinicSettings(settings);
                    showToast('Настройките бяха запазени успешно!');
                  }}
                  className="px-6 py-3 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs transition-all shadow-md shadow-purple-900/15 cursor-pointer"
                >
                  Запази промените
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* МОДАЛ: РЪЧНО ЗАПИСВАНЕ НА ЧАС ОТ ЛЕКАРКАТА (ТЕЛЕФОН/КАБИНЕТ) */}
      {/* ========================================================= */}
      {isManualBookingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <span>Запиши час за пациент (Телефон / На място)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualBookingOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Име и фамилия на пациента *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="напр. Димитър Георгиев"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Телефонен номер *
                  </label>
                  <input
                    type="tel"
                    required
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="088 888 8888"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Имейл адрес (по избор)
                  </label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="dimitar@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Изберете процедура *
                </label>
                <select
                  value={manualServiceId}
                  onChange={(e) => setManualServiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} (~{s.duration_minutes} мин. - {s.price_bgn} €)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Дата *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Начален час *
                  </label>
                  <input
                    type="time"
                    required
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setManualTime(slot)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                          manualTime === slot
                            ? 'bg-purple-800 text-white border-purple-800'
                            : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Бележка / Оплакване на пациента (по избор)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="напр. обаждане по телефона: болка в долен десен зъб"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsManualBookingOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs shadow-md shadow-purple-900/15 cursor-pointer transition-all"
                >
                  {manualSubmitting ? 'Запазване...' : 'Запиши часа в графика'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* МОДАЛ: ДОБАВЯНЕ НА НОВА УСЛУГА */}
      {/* ========================================================= */}
      {isNewServiceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                  <FileText className="w-4 h-4" />
                </div>
                <span>Нова дентална услуга</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewServiceOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddServiceSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Име на процедурата *
                </label>
                <input
                  type="text"
                  required
                  value={newServiceTitle}
                  onChange={(e) => setNewServiceTitle(e.target.value)}
                  placeholder="напр. Фотополимерна обтурация"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Категория
                </label>
                <input
                  type="text"
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  placeholder="напр. Терапия, Естетика, Профилактика"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Продължителност (мин) *
                  </label>
                  <input
                    type="number"
                    required
                    min={15}
                    step={15}
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Цена (€) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Описание на процедурата
                </label>
                <textarea
                  rows={3}
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Опишете накратко какво включва манипулацията..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewServiceOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs shadow-md shadow-purple-900/15 cursor-pointer transition-all"
                >
                  Добави услугата
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ИНТЕРАКТИВЕН ПОП-ЪП МОДАЛ ЗА ДЕТАЙЛИ ОТ KPI КАРТИТЕ */}
      {/* ========================================================= */}
      {activeKpiModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setActiveKpiModal(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                {activeKpiModal === 'today' && (
                  <div className="w-10 h-10 rounded-xl bg-purple-100/90 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                )}
                {activeKpiModal === 'upcoming' && (
                  <div className="w-10 h-10 rounded-xl bg-indigo-100/90 text-indigo-700 flex items-center justify-center border border-indigo-200 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                )}
                {activeKpiModal === 'completed' && (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                {activeKpiModal === 'revenue' && (
                  <div className="w-10 h-10 rounded-xl bg-purple-100/90 text-purple-800 flex items-center justify-center border border-purple-200 shrink-0 font-bold">
                    <Euro className="w-5 h-5" />
                  </div>
                )}

                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug">
                    {activeKpiModal === 'today' && `Часове за днес (${formatBulgarianDate(todayStr).split(' ')[0]} ${formatBulgarianDate(todayStr).split(' ')[1]})`}
                    {activeKpiModal === 'upcoming' && 'Предстоящи потвърдени часове'}
                    {activeKpiModal === 'completed' && 'Приключили прегледи'}
                    {activeKpiModal === 'revenue' && 'Дневен финансов отчет'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {activeKpiModal === 'today' && `${kpiTodayList.length} записани пациента за деня`}
                    {activeKpiModal === 'upcoming' && `Общо ${kpiUpcomingList.length} потвърдени посещения в графика`}
                    {activeKpiModal === 'completed' && `Общо ${kpiCompletedList.length} успешно извършени процедури`}
                    {activeKpiModal === 'revenue' && `Дневен оборот: ${todayRevenue} € (${(todayRevenue * 1.95583).toFixed(0)} лв.)`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Затвори"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-3.5 flex-1">
              
              {/* СЕКЦИЯ 1: ДНЕС */}
              {activeKpiModal === 'today' && (
                <>
                  {kpiTodayList.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2 text-xl">
                        ☀️
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">Няма записани часове за днес ☀️</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        Графикът за днес ({formatBulgarianDate(todayStr)}) е напълно свободен ☕. Можете да добавите час ръчно по всяко време.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveKpiModal(null);
                          setManualDate(todayStr);
                          setManualTime('10:00');
                          setIsManualBookingOpen(true);
                        }}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ Запиши час за днес</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {kpiTodayList.map((apt) => (
                        <div
                          key={apt.id}
                          className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 hover:border-purple-300 transition-all shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-extrabold text-xs border border-purple-100/90 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-purple-600" />
                                <span>{apt.start_time?.slice(0, 5)} - {apt.end_time?.slice(0, 5)}</span>
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  apt.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}
                              >
                                {apt.status === 'completed' ? 'Приключил ✓' : 'Потвърден'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-purple-900 bg-purple-50/70 px-2 py-0.5 rounded-lg border border-purple-100">
                              {apt.service_price} €
                            </span>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                              {apt.patient_name}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                              {apt.service_title} <span className="text-slate-400">({apt.service_duration} мин)</span>
                            </p>
                            {apt.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                💬 {apt.notes}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={`tel:${apt.patient_phone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                              >
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>{apt.patient_phone}</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleSendReminder(apt)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                  apt.reminder_sent
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-purple-50 text-purple-800 border-purple-100 hover:bg-purple-100'
                                }`}
                                title="Копирай напомняне за Viber/SMS"
                              >
                                <Bell className="w-3 h-3 text-purple-600" />
                                <span>{apt.reminder_sent ? 'Напомнено ✓' : 'Напомняне'}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 ml-auto">
                              {apt.status === 'confirmed' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(apt.id, 'completed')}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    Приключи ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                    className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                                  >
                                    Отмени
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(apt.id, 'confirmed')}
                                  className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                                >
                                  Върни като потвърден
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteAppointment(apt.id, apt.patient_name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Изтрий часа"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* СЕКЦИЯ 2: ПРЕДСТОЯЩИ */}
              {activeKpiModal === 'upcoming' && (
                <>
                  {kpiUpcomingList.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-2 text-xl">
                        ☕
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">Няма предстоящи часове — графикът е спокоен ☕</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        В момента няма бъдещи потвърдени часове. Нови онлайн резервации ще се появят тук веднага след записване 🌤️.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {kpiUpcomingList.map((apt) => (
                        <div
                          key={apt.id}
                          className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 hover:border-indigo-300 transition-all shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 font-extrabold text-xs border border-indigo-100 flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 text-indigo-600" />
                                <span>{formatBulgarianDate(apt.date)}</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{apt.start_time?.slice(0, 5)} - {apt.end_time?.slice(0, 5)}</span>
                              </span>
                            </div>
                            <span className="text-xs font-bold text-indigo-900 bg-indigo-50/70 px-2 py-0.5 rounded-lg border border-indigo-100">
                              {apt.service_price} €
                            </span>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                              {apt.patient_name}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                              {apt.service_title} <span className="text-slate-400">({apt.service_duration} мин)</span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={`tel:${apt.patient_phone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                              >
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>{apt.patient_phone}</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleSendReminder(apt)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                  apt.reminder_sent
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-indigo-50 text-indigo-800 border-indigo-100 hover:bg-indigo-100'
                                }`}
                                title="Копирай напомняне за Viber/SMS"
                              >
                                <Bell className="w-3 h-3 text-indigo-600" />
                                <span>{apt.reminder_sent ? 'Напомнено ✓' : 'Напомняне'}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDateFilter(apt.date);
                                  setActiveKpiModal(null);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Покажи тази дата в графика"
                              >
                                <span>В графика</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(apt.id, 'completed')}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                              >
                                Приключи ✓
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                              >
                                Отмени
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* СЕКЦИЯ 3: ПРИКЛЮЧИЛИ */}
              {activeKpiModal === 'completed' && (
                <>
                  {kpiCompletedList.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 text-xl">
                        🌤️
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">Все още няма приключили прегледи днес 🌤️</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        След като извършите процедура за даден пациент, натиснете зеления бутон „Приключи ✓“ на съответния час.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {kpiCompletedList.map((apt) => (
                        <div
                          key={apt.id}
                          className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 hover:border-emerald-300 transition-all shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-extrabold text-xs border border-emerald-100 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{formatBulgarianDate(apt.date)}</span>
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {apt.start_time?.slice(0, 5)} ч.
                              </span>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                              +{apt.service_price} €
                            </span>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">
                              {apt.patient_name}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium">
                              {apt.service_title}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">{apt.patient_phone}</span>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(apt.id, 'confirmed')}
                              className="text-slate-400 hover:text-slate-600 underline text-[11px] cursor-pointer"
                            >
                              Върни като потвърден
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* СЕКЦИЯ 4: ДНЕВЕН ОБОРОТ */}
              {activeKpiModal === 'revenue' && (
                <div className="space-y-4">
                  {/* Summary Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Дневен оборот</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-purple-900">{todayRevenue}</span>
                        <span className="text-xs font-extrabold text-purple-700">€</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">≈ {(todayRevenue * 1.95583).toFixed(0)} лв.</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Реализиран (приключили)</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-emerald-700">{kpiRevenueCompleted}</span>
                        <span className="text-xs font-extrabold text-emerald-600">€</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">от {kpiTodayList.filter(a => a.status === 'completed').length} пациента</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Предстоящ за днес</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-indigo-800">{kpiRevenuePending}</span>
                        <span className="text-xs font-extrabold text-indigo-600">€</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">от {kpiTodayList.filter(a => a.status === 'confirmed').length} пациента</span>
                    </div>
                  </div>

                  {/* List of procedures today */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2.5">
                      Разбивка по процедури за днес ({kpiTodayList.length})
                    </h4>

                    {kpiTodayList.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center bg-slate-50 rounded-xl">
                        Няма записани часове за днес, от които да се изчисли оборот.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {kpiTodayList.map((apt) => (
                          <div
                            key={apt.id}
                            className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 truncate">
                                  {apt.patient_name}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    apt.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {apt.status === 'completed' ? 'Приключил' : 'Очаква се'}
                                </span>
                              </div>
                              <p className="text-slate-500 text-[11px] truncate mt-0.5">
                                {apt.start_time?.slice(0, 5)} ч. • {apt.service_title}
                              </p>
                            </div>

                            <span className="font-bold text-purple-900 shrink-0 text-sm">
                              +{apt.service_price} €
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveKpiModal(null);
                  setManualDate(todayStr);
                  setManualTime('10:00');
                  setIsManualBookingOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-900 bg-purple-100/70 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-purple-700" />
                <span>+ Запиши нов час</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
              >
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
