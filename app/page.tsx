import Navbar from './components/Navbar';
import HeroScroll from './components/HeroScroll';
import Features from './components/Features';
import CtaFooter from './components/CtaFooter';

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroScroll />
      <Features />
      <CtaFooter />
    </>
  );
}
