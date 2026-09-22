'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  getAvailableSlots,
} from '@/lib/storage';
import { formatBulgarianDate } from '@/lib/notifications';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Bell,
  Trash2,
  Edit,
  ExternalLink,
  LogOut,
  Lock,
  Building,
  CalendarOff,
  Search,
  Check,
  AlertTriangle,
} from 'lucide-react';
import InteractiveCalendar from '@/components/InteractiveCalendar';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
  const fetchAllData = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

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
      // Автоматичен демо вход с Google профил на д-р Аяз
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

  // Промяна на статус на час
  const handleStatusChange = async (aptId: string, newStatus: AppointmentStatus) => {
    await updateAppointmentStatus(aptId, newStatus);
    setAppointments((prev) =>
      prev.map((a) => (a.id === aptId ? { ...a, status: newStatus } : a))
    );
    showToast(`Статусът на часа е променен на "${newStatus === 'completed' ? 'Приключил' : newStatus === 'cancelled' ? 'Отменен' : 'Потвърден'}"`);
  };

  // Изпращане на напомняне и копиране на съобщение за Viber/SMS
  const handleSendReminder = async (apt: Appointment) => {
    const res = await sendAppointmentReminder(apt.id);
    if (res.success) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, reminder_sent: true } : a))
      );
      const reminderText = `Здравейте ${apt.patient_name}, напомняме Ви за Вашия час при Д-р Джанел Аяз на ${formatBulgarianDate(apt.date)} от ${apt.start_time} ч. Кабинет: гр. Търговище, бул. „Васил Левски“ №12, тел. 088 812 3456.`;
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

  // Превключване на активност на услуга
  const handleToggleServiceActive = async (service: Service) => {
    const updated = await updateService(service.id, { is_active: !service.is_active });
    if (updated) {
      setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)));
      showToast(`Услугата е ${updated.is_active ? 'активирана' : 'скрита'}.`);
    }
  };

  // Запазване на промени по работното време
  const handleWorkingHourChange = async (
    dayOfWeek: DayOfWeek,
    field: keyof WorkingHour,
    value: any
  ) => {
    const updated = await updateWorkingHour(dayOfWeek, { [field]: value });
    if (updated) {
      setWorkingHours((prev) =>
        prev.map((wh) => (wh.day_of_week === dayOfWeek ? updated : wh))
      );
    }
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

  // Филтрирани часове
  const filteredAppointments = appointments.filter((apt) => {
    if (selectedDateFilter && apt.date !== selectedDateFilter) return false;
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = apt.patient_name.toLowerCase().includes(term);
      const matchPhone = apt.patient_phone.toLowerCase().includes(term);
      const matchService = apt.service_title?.toLowerCase().includes(term);
      return matchName || matchPhone || matchService;
    }
    return true;
  });

  // Статистики за таблото
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDateObj = new Date();
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowStr = tomorrowDateObj.toISOString().split('T')[0];

  // Брой активни часове по дати за календара
  const appointmentsByDate = appointments.reduce((acc, apt) => {
    if (apt.status !== 'cancelled') {
      acc[apt.date] = (acc[apt.date] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const todayCount = appointments.filter((a) => a.date === todayStr && a.status !== 'cancelled').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const totalUpcoming = appointments.filter((a) => a.date >= todayStr && a.status === 'confirmed').length;

  // ==========================================
  // АКО ПОТРЕБИТЕЛЯТ НЕ Е ЛОГНАТ -> ЕКРАН ЗА ВХОД
  // ==========================================
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-linear-to-b from-purple-100/60 via-purple-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-purple-200/90 shadow-2xl shadow-purple-900/10 p-8 sm:p-10 text-center relative overflow-hidden">
          {/* Decorative Lilac Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-purple-600 via-purple-500 to-indigo-600" />

          {/* Logo icon */}
          <div className="w-16 h-16 rounded-2xl bg-purple-700 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-900/20">
            <ToothIcon className="w-8 h-8 text-purple-100" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <Lock className="w-3.5 h-3.5 text-purple-700" />
            <span>Административен Панел</span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">
            Д-р Джанел Аяз
          </h1>
          <p className="text-xs text-slate-500 mt-1 mb-8">
            Дентален Кабинет • гр. Търговище
          </p>

          <div className="space-y-3.5">
            {/* Direct Doctor Access - Primary */}
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-3.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-purple-200" />
              <span>Влез в графика на кабинета (Д-р Джанел Аяз)</span>
            </button>

            {/* Optional Google Sign-in button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50/50 text-slate-700 font-medium text-xs flex items-center justify-center gap-2.5 transition-all"
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
              <span>Вход с Google акаунт</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <Link href="/" className="text-purple-700 hover:underline flex items-center gap-1">
              &larr; Към публичния уебсайт
            </Link>
            <span>Търговище</span>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // ОСНОВЕН ИЗГЛЕД НА АДМИН ПАНЕЛА
  // ==========================================
  return (
    <div className="min-h-screen bg-[#FAF8FC] text-slate-900 flex flex-col">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-purple-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-purple-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-purple-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-purple-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center text-white shadow-md shadow-purple-900/20">
                <ToothIcon className="w-5 h-5 text-purple-100" />
              </div>
              <div>
                <span className="block text-base font-extrabold text-slate-900 leading-tight">
                  Админ Панел | График и Услуги
                </span>
                <span className="block text-xs font-semibold text-purple-600">
                  {adminUser?.name} • гр. Търговище
                </span>
              </div>
            </div>

            {/* Quick Actions & Logout */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Към сайта</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Изход</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        
        {/* Navigation Tabs (Mobile Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none border-b border-purple-200/80 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
              activeTab === 'schedule'
                ? 'bg-purple-800 text-white shadow-md shadow-purple-900/20'
                : 'bg-white text-slate-700 border border-purple-100 hover:bg-purple-50'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-purple-600" />
            <span>График & Часове ({appointments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
              activeTab === 'services'
                ? 'bg-purple-800 text-white shadow-md shadow-purple-900/20'
                : 'bg-white text-slate-700 border border-purple-100 hover:bg-purple-50'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Услуги ({services.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hours')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
              activeTab === 'hours'
                ? 'bg-purple-800 text-white shadow-md shadow-purple-900/20'
                : 'bg-white text-slate-700 border border-purple-100 hover:bg-purple-50'
            }`}
          >
            <Clock className="w-4 h-4 text-purple-600" />
            <span>Работно време</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('days_off')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
              activeTab === 'days_off'
                ? 'bg-purple-800 text-white shadow-md shadow-purple-900/20'
                : 'bg-white text-slate-700 border border-purple-100 hover:bg-purple-50'
            }`}
          >
            <CalendarOff className="w-4 h-4 text-purple-600" />
            <span>Почивни дни ({daysOff.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
              activeTab === 'settings'
                ? 'bg-purple-800 text-white shadow-md shadow-purple-900/20'
                : 'bg-white text-slate-700 border border-purple-100 hover:bg-purple-50'
            }`}
          >
            <Building className="w-4 h-4 text-purple-600" />
            <span>Кабинет</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* ТАБ 1: ГРАФИК И ЧАСОВЕ (SCHEDULE) - MOBILE-FIRST */}
        {/* ========================================================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Compact Metric Summary */}
            <div className="grid grid-cols-3 gap-2 bg-white p-3 sm:p-4 rounded-2xl border border-purple-100 shadow-xs text-center">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Днес</span>
                <span className="text-lg sm:text-2xl font-extrabold text-purple-900">{todayCount}</span>
                <span className="text-[10px] text-purple-700 block font-medium">часа</span>
              </div>
              <div className="border-x border-purple-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Предстоящи</span>
                <span className="text-lg sm:text-2xl font-extrabold text-purple-800">{totalUpcoming}</span>
                <span className="text-[10px] text-slate-500 block font-medium">общо</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Приключили</span>
                <span className="text-lg sm:text-2xl font-extrabold text-emerald-600">{completedCount}</span>
                <span className="text-[10px] text-emerald-600 block font-medium">пациента</span>
              </div>
            </div>

            {/* Единен интерактивен график по часове за телефон и компютър */}
            <AdminHourlyCalendar
              selectedDate={selectedDateFilter || todayStr}
              onSelectDate={(d) => setSelectedDateFilter(d)}
              appointments={appointments}
              appointmentsByDate={appointmentsByDate}
              onStatusChange={handleStatusChange}
              onSendReminder={handleSendReminder}
              onDeleteAppointment={handleDeleteAppointment}
              onNewAppointmentAt={(dateStr, timeStr) => {
                setManualDate(dateStr);
                setManualTime(timeStr);
                setIsManualBookingOpen(true);
              }}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* ТАБ 2: ДЕНТАЛНИ УСЛУГИ (SERVICES MANAGEMENT) */}
        {/* ========================================================= */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Управление на услуги & ценоразпис
                </h3>
                <p className="text-xs text-slate-500">
                  Промените тук се отразяват незабавно в публичния сайт и формата за записване.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewServiceOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Добави нова услуга</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`p-6 rounded-2xl bg-white border transition-all flex flex-col justify-between ${
                    service.is_active
                      ? 'border-purple-100 shadow-xs hover:border-purple-300'
                      : 'border-slate-200 bg-slate-50/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700">
                        {service.category || 'Стоматология'}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        <span>~{service.duration_minutes} мин.</span>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base leading-snug">
                      {service.title}
                    </h4>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-3">
                      {service.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-purple-50 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-purple-900">
                      {service.price_bgn} €
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleServiceActive(service)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                          service.is_active
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {service.is_active ? 'Скрий' : 'Активирай'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteService(service.id, service.title)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
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
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Седмично работно време на кабинета
              </h3>
              <p className="text-xs text-slate-500">
                Задайте работен интервал и обедна почивка по дни от седмицата. Системата автоматично генерира часови слотове само в тези граници.
              </p>
            </div>

            <div className="rounded-3xl bg-white border border-purple-100 shadow-xs overflow-hidden">
              <div className="divide-y divide-slate-100">
                {workingHours.map((wh) => (
                  <div
                    key={wh.day_of_week}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Day name & toggle working */}
                    <div className="flex items-center gap-3 w-44">
                      <input
                        type="checkbox"
                        checked={wh.is_working}
                        id={`working-${wh.day_of_week}`}
                        onChange={(e) =>
                          handleWorkingHourChange(wh.day_of_week, 'is_working', e.target.checked)
                        }
                        className="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500"
                      />
                      <label
                        htmlFor={`working-${wh.day_of_week}`}
                        className="font-bold text-sm text-slate-900 cursor-pointer"
                      >
                        {wh.day_name}
                      </label>
                    </div>

                    {wh.is_working ? (
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        {/* Start and End Time */}
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Смяна:</span>
                          <input
                            type="time"
                            value={wh.start_time}
                            onChange={(e) =>
                              handleWorkingHourChange(wh.day_of_week, 'start_time', e.target.value)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white"
                          />
                          <span>—</span>
                          <input
                            type="time"
                            value={wh.end_time}
                            onChange={(e) =>
                              handleWorkingHourChange(wh.day_of_week, 'end_time', e.target.value)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white"
                          />
                        </div>

                        {/* Break Times */}
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Обедна почивка:</span>
                          <input
                            type="time"
                            value={wh.break_start || ''}
                            onChange={(e) =>
                              handleWorkingHourChange(wh.day_of_week, 'break_start', e.target.value || null)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white"
                          />
                          <span>—</span>
                          <input
                            type="time"
                            value={wh.break_end || ''}
                            onChange={(e) =>
                              handleWorkingHourChange(wh.day_of_week, 'break_end', e.target.value || null)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Почивен ден за д-р Аяз
                      </span>
                    )}

                    <div className="text-xs text-purple-700 font-semibold">
                      {wh.is_working ? 'Активен ден' : 'Затворен'}
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
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Обявяване на почивни дни, отпуск или конференции
              </h3>
              <p className="text-xs text-slate-500">
                Когато обявите неработен период тук, пациентите няма да могат да избират тези дати за записване на час.
              </p>
            </div>

            {/* Form to declare day off */}
            <form
              onSubmit={handleAddDayOffSubmit}
              className="p-6 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-4"
            >
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-purple-600" />
                <span>+ Добави нов неработен период</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Начална дата *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDayOffStart}
                    onChange={(e) => setNewDayOffStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Крайна дата *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDayOffEnd}
                    onChange={(e) => setNewDayOffEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Причина *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDayOffReason}
                    onChange={(e) => setNewDayOffReason(e.target.value)}
                    placeholder="напр. Годишен отпуск, Обучение София"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-sm"
              >
                Обяви неработен период
              </button>
            </form>

            {/* List of Days Off */}
            <div className="rounded-3xl bg-white border border-purple-100 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-purple-100 font-bold text-slate-900 text-sm">
                Всички обявени неработни дни ({daysOff.length})
              </div>

              {daysOff.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Няма обявени отпуски или почивни дни.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {daysOff.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 flex items-center justify-between gap-4 hover:bg-purple-50/20"
                    >
                      <div>
                        <span className="block font-bold text-slate-900 text-sm">
                          {item.reason}
                        </span>
                        <span className="block text-xs text-purple-700 font-semibold mt-0.5">
                          {formatBulgarianDate(item.start_date)} — {formatBulgarianDate(item.end_date)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDayOff(item.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
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
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Настройки на стоматологичния кабинет
              </h3>
              <p className="text-xs text-slate-500">
                Информацията за лекаря и адреса се визуализира в сайта и в имейл напомнянията.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-purple-100 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Име на лекуващия лекар
                </label>
                <input
                  type="text"
                  value={settings.doctor_name}
                  onChange={(e) => setSettings({ ...settings, doctor_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Точен адрес в Търговище
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Телефон за контакти
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Имейл адрес
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Напомняне преди часа (в часове)
                </label>
                <input
                  type="number"
                  value={settings.reminder_hours_before}
                  onChange={(e) =>
                    setSettings({ ...settings, reminder_hours_before: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  await updateClinicSettings(settings);
                  showToast('Настройките бяха запазени успешно!');
                }}
                className="mt-4 px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/20"
              >
                Запази настройките
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* МОДАЛ: РЪЧНО ЗАПИСВАНЕ НА ЧАС ОТ ЛЕКАРКАТА (ТЕЛЕФОН/КАБИНЕТ) */}
      {/* ========================================================= */}
      {isManualBookingOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-purple-200 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-700" />
                <span>Запиши час за пациент (Телефон / На място)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualBookingOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Изберете процедура *
                </label>
                <select
                  value={manualServiceId}
                  onChange={(e) => setManualServiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setManualTime(slot)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                          manualTime === slot
                            ? 'bg-purple-700 text-white border-purple-700'
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
                  Бележка / Оплакване (по избор)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="напр. обади се по телефона с остра болка"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsManualBookingOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-purple-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                <span>Добавяне на нова дентална услуга</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewServiceOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
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
                  placeholder="напр. Избелване на единичен зъб"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
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
                  placeholder="напр. Естетика, Профилактика, Терапия"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
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
                  placeholder="Опишете накратко какво включва процедурата..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewServiceOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20"
                >
                  Добави услугата
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile: 1-Tap Booking */}
      <button
        type="button"
        onClick={() => {
          setManualDate(selectedDateFilter || todayStr);
          setManualTime('10:00');
          setIsManualBookingOpen(true);
        }}
        className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-purple-800 text-white shadow-2xl flex items-center justify-center active:scale-95 transition-transform border border-white/20"
        aria-label="Запиши нов час"
        title="Запиши нов час за пациент"
      >
        <PlusCircle className="w-7 h-7" />
      </button>

    </div>
  );
}
