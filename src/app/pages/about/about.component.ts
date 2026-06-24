import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <article class="about">
      <!-- Ille Preface -->
      <section class="preface">
        <div class="preface__inner">
          <p class="preface__label rise">[ILLE PREFACE]</p>
          <div class="preface__body">
            <p class="rise" style="animation-delay:.08s">
              In an era where cameras have become an essential element of our existence, the lens now extends
              beyond models and celebrities to include everyone engaged with media. Recognizing the gap between
              iconic figures and those struggling with self-esteem, self-love, confidence, and self-appreciation,
              ille emerges as a beacon of support celebrating the splendid diversity and inherent uniqueness that
              surpasses the limitations of conventional standards.
            </p>
            <p class="rise" style="animation-delay:.16s">
              ille represents the collective voice of those who possess an innate understanding and acceptance
              of their own beauty, embracing and cherishing their imperfections. Throughout your journey, ille
              endeavors to break down the barriers that hinder your connection with society and the world of
              cameras, thus paving the way for your media ventures while leaving a permanent impact on your
              personal realm.
            </p>
            <p class="rise" style="animation-delay:.24s">
              Through guidance tailored to suit aspiring talents, ille provides unwavering support to nurture
              and refine potential, and to rebuild a certain pleasure in the movement and the flow of the body
              and the mind, fostering their growth and development.
            </p>
            <p class="rise" style="animation-delay:.32s">
              In addition, ille operates as a modeling agency—representing not only highly trained professionals
              but also fresh, promising faces. While rooted in high fashion standards, the agency expands its
              vision to include commercial and street-style aesthetics, promoting inclusivity and authenticity.
              At its core, ille champions beauty as a reflection of character, confidence, and individuality,
              rather than being confined to traditional measurements. Each model becomes a testament to ille's
              belief in diversity, presence, and purpose—shaping a new narrative where true beauty is seen,
              felt, and remembered.
            </p>
          </div>
        </div>
      </section>

      <!-- Founder -->
      <section class="founder">
        <div class="founder__inner">
          <h2 class="founder__title rise">FOUNDER</h2>

          <div class="founder__grid">
            <div class="founder__text">
              <p class="rise" style="animation-delay:.1s">
                Marie-Thérèse Hanna is a Lebanese top model with ten years of experience in the industry, and a
                movement coach. Her deep-rooted love for fashion and art, combined with her artistic sensibilities
                and passion for capturing emotions in front of the camera, has propelled her to achieve remarkable
                success in every project she undertakes, directing with top celebrities such as Zeina Makki,
                Daniella Rahmeh and many others. Throughout her career, MT has left an indelible mark on the
                fashion scenes of the Middle East and Europe, gracing the pages of international magazines and
                becoming the first Lebanese model to participate in both Paris and Dubai Fashion Week.
              </p>
              <p class="rise" style="animation-delay:.18s">
                Following a life-altering event—the tragic Beirut Blast in August 2020—MT found herself facing
                physical and emotional challenges due to the scars she sustained. This experience inspired her
                to embark on a journey of promoting diversity and sharing her personal stories. In MT's eyes,
                fashion is not merely about conforming to standards; it is an expressive medium that goes beyond
                superficiality.
              </p>
              <p class="rise" style="animation-delay:.26s">
                In 2020, MT made a groundbreaking contribution to the modeling industry in Lebanon by introducing
                Model Coaching. As her teachings spread, they transcended the realm of models and resonated with
                a wide range of audiences. From these experiences, MT conceived the idea of ille, a platform
                born out of the myriad of inspirations and stories shared in her classes.
              </p>
              <p class="rise" style="animation-delay:.34s">
                Her belief is that everyone deserves to feel beautiful and exude the confidence that comes from
                embracing their uniqueness, mirroring the charisma of exceptional performers.
              </p>
              <p class="rise" style="animation-delay:.42s">
                MT is at the forefront of a movement that champions self-appreciation and challenges societal
                norms perpetuated by beauty filters, cosmetic enhancements, and anything that deviates from one's
                true self. Through her revolutionary approach, she aims to redefine the standards of beauty,
                empowering individuals to embrace their authentic selves and celebrate their own unique qualities.
              </p>
            </div>

            <figure class="founder__photo rise" style="animation-delay:.2s">
              <img src="assets/mt.webp" alt="Marie-Thérèse Hanna, founder of ille" />
            </figure>
          </div>
        </div>
      </section>
    </article>
  `,
  styles: [`
    .about {
      background: #f7f6f3;
      color: #141414;
      margin: 0 calc(50% - 50vw);
      width: 100vw;
      padding-bottom: 100px;
    }

    .preface {
      padding: 48px 32px 80px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .preface__inner,
    .founder__inner {
      max-width: 1180px;
      margin: 0 auto;
    }
    .preface__label {
      font-family: var(--body);
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #141414;
      margin: 0 0 36px;
    }
    .preface__body p {
      font-family: var(--body);
      font-size: clamp(15px, 1.6vw, 17px);
      font-weight: 300;
      line-height: 1.85;
      color: #2a2a2a;
      margin: 0 0 28px;
      max-width: 100%;
    }
    .preface__body p:last-child { margin-bottom: 0; }

    .founder {
      padding: 72px 32px 0;
    }
    .founder__title {
      font-family: var(--body);
      font-size: clamp(48px, 10vw, 112px);
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 0.95;
      text-transform: uppercase;
      color: #141414;
      margin: 0 0 48px;
    }
    .founder__grid {
      display: grid;
      grid-template-columns: 1fr minmax(280px, 420px);
      gap: clamp(32px, 5vw, 64px);
      align-items: start;
    }
    .founder__text p {
      font-family: var(--body);
      font-size: clamp(14px, 1.5vw, 16px);
      font-weight: 300;
      line-height: 1.82;
      color: #2a2a2a;
      margin: 0 0 24px;
    }
    .founder__text p:last-child { margin-bottom: 0; }

    .founder__photo {
      margin: 0;
      position: sticky;
      top: 110px;
    }
    .founder__photo img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
      aspect-ratio: 3 / 4;
      filter: grayscale(0.08);
    }

    @media (max-width: 900px) {
      .founder__grid {
        grid-template-columns: 1fr;
      }
      .founder__photo {
        position: static;
        order: -1;
        max-width: 420px;
      }
      .founder__title { margin-bottom: 32px; }
    }
    @media (max-width: 600px) {
      .preface, .founder { padding-left: 24px; padding-right: 24px; }
      .preface { padding-top: 32px; }
    }
  `],
})
export class AboutComponent {}
