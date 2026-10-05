'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ServicesSection from '@/components/ServicesSection';
import AboutSection from '@/components/AboutSection';
import ReviewsAndFaq from '@/components/ReviewsAndFaq';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import MobileBottomBar from '@/components/MobileBottomBar';

import { Service, WorkingHour } from '@/types/database';
import { getServices, getWorkingHours } from '@/lib/storage';
import { initialServices, initialWorkingHours } from '@/lib/data/initialData';

export default function HomePage() {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(initialWorkingHours);

  useEffect(() => {
    let active = true;
    const loadData = () => Promise.all([getServices(), getWorkingHours()])
      .then(([fetchedServices, fetchedHours]) => {
        if (!active) return;
        setServices(fetchedServices);
        setWorkingHours(fetchedHours);
      })
      .catch(err => console.error('Failed to load home page data:', err));
    void loadData();
    window.addEventListener('dent_data_updated', loadData);
    return () => {
      active = false;
      window.removeEventListener('dent_data_updated', loadData);
    };
  }, []);

  return (
    <main className="clinic-home min-h-screen pb-20 md:pb-0 bg-white text-slate-900">
      <Navbar />
      <Hero />
      <ServicesSection services={services} />
      <AboutSection />
      <ReviewsAndFaq />
      <ContactSection workingHours={workingHours} />
      <Footer />
      <MobileBottomBar />
    </main>
  );
}
