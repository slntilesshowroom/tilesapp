import { getAllSliders } from "@/app/actions/sliderActions";
import { HeroSliderClient, defaultSlides } from "./HeroSlider";

/**
 * Server wrapper that resolves the slides before the page is sent.
 *
 * The carousel itself still needs client state, but fetching its data on the
 * client meant the hero — the LCP element on the home page — only started
 * loading after hydration, behind a full-screen pulse placeholder.
 */
export const HeroSlider = async () => {
  const sliders = await getAllSliders();
  const slides = sliders && sliders.length > 0 ? sliders : defaultSlides;

  return <HeroSliderClient slides={slides} />;
};
