
export interface NotificationPayload {
  to_name: string;
  to_email?: string;
  to_phone: string;
  service_title: string;
  date: string;
  time: string;
  doctor_name: string;
  clinic_address: string;
  type: 'confirmation' | 'reminder';
}

export function formatBulgarianDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const months = [
      'януари', 'февруари', 'март', 'април', 'май', 'юни',
      'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'
    ];
    return `${day} ${months[month - 1]} ${year} г.`;
  } catch {
    return dateStr;
  }
}

export function generateNotificationMessage(payload: NotificationPayload): {
  subject: string;
  text: string;
  smsText: string;
} {
  const formattedDate = formatBulgarianDate(payload.date);

  if (payload.type === 'confirmation') {
    return {
      subject: `Потвърден час за зъболекар | ${payload.doctor_name}`,
      text: `Здравейте, ${payload.to_name}!

Вашият час за посещение е успешно записан:
• Процедура: ${payload.service_title}
• Дата: ${formattedDate}
• Начален час: ${payload.time} ч.
• Кабинет: ${payload.clinic_address}, гр. Търговище
• Лекуващ лекар: ${payload.doctor_name}

Моля, елате 5 минути преди посочения час. Ако се наложи да отмените или преместите часа, моля да ни уведомите предварително.

С уважение,
${payload.doctor_name}
`,
      smsText: `Напомняне: Имате записан час при ${payload.doctor_name} за ${formattedDate} в ${payload.time} ч. Кабинет: ${payload.clinic_address}. Тел: +359 88 812 3456`,
    };
  }

  return {
    subject: `Напомняне за Вашия час утре | ${payload.doctor_name}`,
    text: `Здравейте, ${payload.to_name}!

Напомняме Ви за предстоящия Ви час утре при ${payload.doctor_name}:
• Процедура: ${payload.service_title}
• Дата: ${formattedDate}
• Начален час: ${payload.time} ч.
• Адрес: ${payload.clinic_address}

Очакваме Ви с усмивка!
`,
    smsText: `Напомняне: Вашият час при ${payload.doctor_name} е утре (${formattedDate}) от ${payload.time} ч. Кабинет: ${payload.clinic_address}.`,
  };
}

export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  // Симулация и логване на изпращането (или свързване с Resend API / SMS API)
  const messageData = generateNotificationMessage(payload);
  console.log('Sending Notification:', {
    payload,
    messageData,
  });

  // В реална среда тук се извиква Resend или SMS доставчик
  return {
    success: true,
    message: `Изпратено успешно до ${payload.to_name} (${payload.to_email || payload.to_phone})`,
  };
}
