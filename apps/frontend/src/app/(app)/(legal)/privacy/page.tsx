const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[20px] font-semibold mt-[32px] mb-[12px]">{children}</h2>
);

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[16px] font-semibold mt-[20px] mb-[8px]">{children}</h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[14px] leading-[22px] mb-[12px] opacity-90">{children}</p>
);

const Ul = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-[20px] mb-[12px] space-y-[4px] text-[14px] leading-[22px] opacity-90">
    {children}
  </ul>
);

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold mb-[8px]">Privacy Policy</h1>
      <P>Last updated: 17 September 2026</P>

      <P>
        Shacky Postiz (&quot;Shacky Postiz&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;) is a
        social media scheduling and management service, operated as an individual
        business based in India. This Privacy Policy explains what personal data we
        collect through this instance of the service, why we collect it, who we share
        it with, and the choices and rights you have.
      </P>
      <P>
        If you have any question about this policy or want to exercise any of the
        rights described below, contact us at{' '}
        <a href="mailto:support@shackyapps.in" className="underline">
          support@shackyapps.in
        </a>
        .
      </P>

      <H2>1. The service, in brief</H2>
      <P>
        Shacky Postiz lets you connect your social media and messaging accounts,
        schedule and publish posts across them, view analytics, manage a media
        library, and collaborate with teammates inside an organization. To do that,
        we necessarily process the account details you give us, the credentials that
        let us post on your behalf to the platforms you connect, and the content you
        upload or create.
      </P>

      <H2>2. The data we collect</H2>

      <H3>2.1 Account and identity data</H3>
      <P>
        When you register, we collect your name, email address, and password (stored
        as a salted hash, never in plain text). If you sign in with a third-party
        provider (Google, GitHub, Apple, or a generic OAuth provider you configure),
        we receive the identity details that provider shares with us. We also store
        your organization name, timezone, and language preference.
      </P>

      <H3>2.2 Connected platform data</H3>
      <P>
        When you connect a social or messaging channel (X, LinkedIn, Instagram,
        Facebook, TikTok, YouTube, Reddit, Pinterest, Discord, Slack, Mastodon,
        Bluesky, Threads, Farcaster, Telegram, and other supported platforms), we
        store the OAuth access/refresh tokens or API credentials needed to publish on
        your behalf, along with basic profile data (page/channel name, avatar,
        follower counts) and post-level analytics that the platform's API returns to
        us (impressions, likes, comments, etc.). We only request the OAuth scopes
        needed to schedule posts, read analytics, and manage the channels you
        explicitly connect.
      </P>

      <H3>2.3 Content you create or upload</H3>
      <P>
        Post text, images, and videos you upload or generate through the service are
        stored either on our own server disk or in a Cloudflare R2 bucket we control,
        depending on how this instance is configured. Uploaded media may pass through
        an optional third-party AI image/video generation provider (see Section 4)
        when you explicitly use that feature.
      </P>

      <H3>2.4 Billing data</H3>
      <P>
        If you subscribe to a paid plan, your payment is handled directly by
        Razorpay or Stripe (for web checkout) or by Apple/Google via RevenueCat (for
        the mobile app). We never see or store your full card number. We do store
        the subscription plan, billing cycle, amounts charged, and the customer/
        subscription identifiers those processors give us, so we can reconcile your
        account status.
      </P>

      <H3>2.5 Logs and usage data</H3>
      <P>
        We keep standard server logs (IP address, browser/device information,
        timestamps, pages and API routes accessed) for security, debugging, and
        abuse-prevention purposes.
      </P>

      <H3>2.6 Support communications</H3>
      <P>
        If you email us or otherwise contact us for support, we keep that
        correspondence, including any attachments, to resolve your request and for
        our own record-keeping.
      </P>

      <H3>2.7 Cookies and similar technologies</H3>
      <P>
        We use a small number of strictly necessary cookies to keep you signed in
        and to remember basic preferences (e.g. language, theme). Depending on how
        this instance is configured, it may also use optional analytics or
        advertising scripts (for example Google Tag Manager, a Meta/Facebook Pixel,
        or a self-hosted analytics tool) to understand aggregate usage of the
        marketing pages. These are only active where the corresponding integration
        has been configured; you can block them with your browser's cookie or
        tracking-protection settings.
      </P>

      <H2>3. How we use your data</H2>
      <Ul>
        <li>To create and operate your account and organization.</li>
        <li>
          To publish, schedule, and retrieve analytics for the posts you create,
          through the social platforms you connect.
        </li>
        <li>To process payments and manage your subscription.</li>
        <li>To send you transactional email (e.g. account activation, password reset, billing receipts, post-failure alerts) via our email provider.</li>
        <li>To respond to support requests.</li>
        <li>To detect, prevent, and investigate fraud, abuse, and security incidents.</li>
        <li>To improve the reliability and features of the service.</li>
        <li>To comply with legal obligations.</li>
      </Ul>

      <H2>4. AI-assisted features</H2>
      <P>
        Optional AI features (for example AI-generated images, an AI writing/chat
        assistant, or AI-generated video) send the prompt and, where relevant, the
        media you provide to a third-party AI model provider (such as OpenAI, or a
        video-generation provider like HeyGen or EvoLink) in order to generate the
        output. These providers process that data under their own terms. AI video
        generation is disabled by default on this instance and only runs when an
        administrator has explicitly turned it on.
      </P>

      <H2>5. Who we share data with</H2>
      <P>We share personal data only where necessary to run the service:</P>
      <Ul>
        <li>
          <strong>Connected social platforms</strong> — the content you schedule,
          and the credentials needed to post it, are sent to the platforms you
          connect (Meta, X, LinkedIn, Google, TikTok, etc.).
        </li>
        <li>
          <strong>Payment processors</strong> — Razorpay, Stripe, and, for mobile
          in-app purchases, RevenueCat and the relevant app store.
        </li>
        <li>
          <strong>Cloud storage</strong> — Cloudflare R2, if this instance is
          configured to store media there instead of locally.
        </li>
        <li>
          <strong>Email delivery</strong> — Resend, to send transactional email.
        </li>
        <li>
          <strong>AI providers</strong> — as described in Section 4, only when you
          use an AI feature.
        </li>
        <li>
          <strong>Error tracking / infrastructure monitoring</strong> — an error
          tracking tool (e.g. Sentry), if configured, to help us diagnose crashes.
        </li>
        <li>
          Law enforcement or other third parties where required by law, or to
          protect our rights, users, or the public.
        </li>
      </Ul>
      <P>We do not sell your personal data.</P>

      <H2>6. International data transfers</H2>
      <P>
        This instance of Shacky Postiz is operated from India, and our
        infrastructure and the third-party processors listed above may store or
        process data outside your home country. Where required, we rely on
        contractual protections offered by those processors for any cross-border
        transfer.
      </P>

      <H2>7. Data retention</H2>
      <P>
        We keep account and content data for as long as your account is active. If
        you delete your account, we delete or anonymize your personal data within a
        reasonable period, except where we are required to keep billing records for
        longer to meet tax and accounting obligations, or where data must be kept
        longer to resolve disputes or enforce our agreements. Server logs are
        retained for a limited period for security purposes and then deleted or
        aggregated.
      </P>

      <H2>8. Security</H2>
      <P>
        We use industry-standard measures to protect your data, including
        encryption in transit (HTTPS), hashed passwords, and access controls on our
        infrastructure and databases. No method of transmission or storage is
        completely secure, and we cannot guarantee absolute security.
      </P>

      <H2>9. Your rights</H2>
      <P>
        Depending on where you live, you may have rights to access, correct, export,
        or delete your personal data, or to object to or restrict certain
        processing. If you are in India, these rights are available to you under the
        Digital Personal Data Protection Act, 2023. If you are located elsewhere
        (for example the EU/UK or California), we will honor equivalent rights under
        the law that applies to you to the extent it applies to our processing. To
        exercise any of these rights, email{' '}
        <a href="mailto:support@shackyapps.in" className="underline">
          support@shackyapps.in
        </a>
        . You can also delete most of your own data directly from your account
        settings, or disconnect a social channel at any time, which revokes and
        deletes the stored access token for that channel.
      </P>

      <H2>10. Children</H2>
      <P>
        Shacky Postiz is not directed at, and we do not knowingly collect personal
        data from, anyone under the age of 18. If you believe a child has provided
        us personal data, contact us and we will delete it.
      </P>

      <H2>11. Marketing communications</H2>
      <P>
        We may send you product or billing-related email that is necessary to run
        the service; you cannot opt out of these while your account is active.
        Where we send optional marketing or newsletter email, every message includes
        an unsubscribe link.
      </P>

      <H2>12. Third-party sites and services</H2>
      <P>
        The service links out to, and integrates with, third-party platforms and
        payment processors. Their own privacy policies govern how they handle your
        data once it leaves our systems, and we encourage you to review them.
      </P>

      <H2>13. Changes to this policy</H2>
      <P>
        We may update this policy from time to time. If we make material changes,
        we will update the &quot;Last updated&quot; date above and, where appropriate,
        notify you by email or through the app.
      </P>

      <H2>14. Contact us</H2>
      <P>
        For any question about this policy or how we handle your data, contact us
        at{' '}
        <a href="mailto:support@shackyapps.in" className="underline">
          support@shackyapps.in
        </a>
        .
      </P>
    </>
  );
}
