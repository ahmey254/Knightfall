import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Stats } from '@/components/landing/Stats';
import { Testimonials } from '@/components/landing/Testimonials';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Stats />
      <Features />
      <Testimonials />
      <Footer />
    </>
  );
}
