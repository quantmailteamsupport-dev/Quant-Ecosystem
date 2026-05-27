import { describe, it, expect } from 'vitest';
import {
  HomePage,
  PricingPage,
  FeaturesPage,
  SecurityPage,
  AboutPage,
  Header,
  Footer,
  FeatureCard,
  PricingCard,
  CTASection,
  TestimonialCard,
  AppShowcase,
  QUANT_APPS,
} from '../index.js';

describe('Marketing Pages', () => {
  it('should export HomePage component', () => {
    expect(HomePage).toBeDefined();
    expect(typeof HomePage).toBe('function');
  });

  it('should export PricingPage component', () => {
    expect(PricingPage).toBeDefined();
    expect(typeof PricingPage).toBe('function');
  });

  it('should export FeaturesPage component', () => {
    expect(FeaturesPage).toBeDefined();
    expect(typeof FeaturesPage).toBe('function');
  });

  it('should export SecurityPage component', () => {
    expect(SecurityPage).toBeDefined();
    expect(typeof SecurityPage).toBe('function');
  });

  it('should export AboutPage component', () => {
    expect(AboutPage).toBeDefined();
    expect(typeof AboutPage).toBe('function');
  });
});

describe('Marketing Components', () => {
  it('should export Header component', () => {
    expect(Header).toBeDefined();
    expect(typeof Header).toBe('function');
  });

  it('should export Footer component', () => {
    expect(Footer).toBeDefined();
    expect(typeof Footer).toBe('function');
  });

  it('should export FeatureCard component', () => {
    expect(FeatureCard).toBeDefined();
    expect(typeof FeatureCard).toBe('function');
  });

  it('should export PricingCard component', () => {
    expect(PricingCard).toBeDefined();
    expect(typeof PricingCard).toBe('function');
  });

  it('should export CTASection component', () => {
    expect(CTASection).toBeDefined();
    expect(typeof CTASection).toBe('function');
  });

  it('should export TestimonialCard component', () => {
    expect(TestimonialCard).toBeDefined();
    expect(typeof TestimonialCard).toBe('function');
  });

  it('should export AppShowcase component', () => {
    expect(AppShowcase).toBeDefined();
    expect(typeof AppShowcase).toBe('function');
  });
});

describe('App Data', () => {
  it('should export QUANT_APPS with 13 apps', () => {
    expect(QUANT_APPS).toBeDefined();
    expect(Array.isArray(QUANT_APPS)).toBe(true);
    expect(QUANT_APPS).toHaveLength(13);
  });

  it('should have proper app info structure', () => {
    for (const app of QUANT_APPS) {
      expect(app).toHaveProperty('name');
      expect(app).toHaveProperty('description');
      expect(app).toHaveProperty('icon');
      expect(app).toHaveProperty('category');
    }
  });
});
