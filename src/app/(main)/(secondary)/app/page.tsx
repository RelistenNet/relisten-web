const MOBILE = () => (
  <div>
    <h1>Mobile App</h1>

    <p>
      Relisten is now available for download on both iOS and Android. Take all of your live
      recordings on the go.
    </p>

    <p>Yeah - it&apos;s free.</p>

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
        href="    https://play.google.com/store/apps/details?id=net.relisten.android&hl=en_US"
        target="_blank"
        rel="noreferrer"
      >
        Download for Android
      </a>
    </div>

    <h3>Screenshots</h3>
    <a
      href="https://itunes.apple.com/us/app/relisten-all-live-music/id715886886?mt=8"
      target="_blank"
      rel="noreferrer"
    >
      <img src="https://i.imgur.com/QvvnsSA.png" className="max-w-80" alt="relisten for mobile" />
    </a>
  </div>
);

export const metadata = {
  title: 'App',
};

export default MOBILE;
