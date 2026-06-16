const Apps = () => (
  <div className="content">
    <h1>iOS, Android, and Sonos</h1>

    <p>
      Access all of your live recordings on the go. As always - it&apos;s completely free and
      ad-free.
    </p>

    <div className="flex gap-4">
      <a
        className="button"
        href="https://itunes.apple.com/us/app/relisten-all-live-music/id715886886?mt=8"
        target="_blank"
        rel="noreferrer"
      >
        Download for Apple (iOS)
      </a>

      <a
        className="button bg-blue-300"
        href="https://play.google.com/store/apps/details?id=net.relisten.android&hl=en_US"
        target="_blank"
        rel="noreferrer"
      >
        Download for Android (Play Store)
      </a>
    </div>

    <p>
      All of our Relisten platforms are completely open source. If you would like to contribute to
      the mobile app, you can get started here:{' '}
      <a href="https://github.com/relistennet/relisten-mobile" target="_blank" rel="noreferrer">
        https://github.com/relistennet/relisten-mobile
      </a>
    </p>

    <h4 className="text-xl mb-2 font-semibold">Mobile Screenshots</h4>
    <a
      href="https://itunes.apple.com/us/app/relisten-all-live-music/id715886886?mt=8"
      target="_blank"
      rel="noreferrer"
    >
      <img src="https://i.imgur.com/QvvnsSA.png" className="max-w-60" alt="relisten for mobile" />
    </a>

    <hr className="my-8 border-hairline" />

    <h3>Sonos</h3>

    <p>
      Relisten is available for use on all Sonos devices. Enjoy your concertos in the comfort of
      your home.
    </p>

    <p>
      The Sonos integration is open source too. If you would like to contribute, you can get started
      here:{' '}
      <a href="https://github.com/relistennet/relisten-sonos" target="_blank" rel="noreferrer">
        https://github.com/relistennet/relisten-sonos
      </a>
    </p>

    <h3>Client Installation</h3>

    <p>
      Open your Sonos application and go to <strong>Add Music Services</strong> and search for{' '}
      <strong>Relisten</strong>. Easy as pie.
    </p>

    <div className="my-8">
      <img
        src="https://i.imgur.com/Qe7lMlf.jpg"
        alt="add music service"
        width={380}
        className="mx-auto"
      />
    </div>

    <h3 className="mb-6 text-2xl font-semibold">Screenshot</h3>

    <div className="my-8">
      <img src="https://i.imgur.com/q1LbjJ6.png" alt="screenshot" width={380} className="mx-auto" />
    </div>
  </div>
);

export const metadata = {
  title: 'Apps',
};

export default Apps;
