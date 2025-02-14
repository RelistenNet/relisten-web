const About = () => (
  <div>
    <h1>Welcome to Relisten</h1>

    <p>
      Peruse the various bands and enjoy their extensive live catalogues for
      free.
    </p>

    <p>
      This site is powered by{' '}
      <a href="https://archive.org" target="_blank" rel="noreferrer">
        Archive.org
      </a>
      ,{' '}
      <a href="https://phish.in" target="_blank" rel="noreferrer">
        Phish.in
      </a>
      ,{' '}
      <a
        href="https://docs.google.com/spreadsheets/d/1yAXu83gJBz08cW5OXoqNuN1IbvDXD2vCrDKj4zn1qmU/edit#gid=29"
        target="_blank"
        rel="noreferrer"
      >
        The Phish Spreadsheet
      </a>
      , and{' '}
      <a href="https://panicstream.com" target="_blank" rel="noreferrer">
        PanicStream.com
      </a>
      .
    </p>

    <h3>Mission</h3>

    <p>
      We want to provide you with a simple and powerful experience that you can
      enjoy in the home or in the rain.
    </p>

    <h3>Open Source</h3>

    <p>
      This entire platform is open source at{' '}
      <a href="https://github.com/relistennet" target="_blank" rel="noreferrer">
        https://github.com/relistennet
      </a>
      .
    </p>

    <h3>Thank you</h3>

    <p>
      Enjoy <br />-{' '}
      <a href="https://saewitz.com" target="_blank" rel="noreferrer">
        Daniel Saewitz
      </a>{' '}
      and{' '}
      <a href="https://alecgorge.com" target="_blank" rel="noreferrer">
        Alec Gorge
      </a>
      , <a href="mailto:team@relisten.net">team@relisten.net</a>
    </p>

    <br />
    <br />

    <p>
      This site complies with{' '}
      <a
        href="https://archive.org/post/261115/hotlinking-allowed"
        target="_blank"
        rel="noreferrer"
      >
        Archive.org's policy
      </a>
      .
    </p>

    <p className="italic">
      The Grateful Dead and our managing organizations have long encouraged the
      purely non-commercial exchange of music taped at our concerts and those of
      our individual members. That a new medium of distribution has arisen -
      digital audio files being traded over the Internet - does not change our
      policy in this regard. Our stipulations regarding digital distribution are
      merely extensions of those long-standing principles and they are as
      follow: No commercial gain may be sought by websites offering digital
      files of our music, whether through advertising, exploiting databases
      compiled from their traffic, or any other means. All participants in such
      digital exchange acknowledge and respect the copyrights of the performers,
      writers and publishers of the music. This notice should be clearly posted
      on all sites engaged in this activity. We reserve the ability to withdraw
      our sanction of non-commercial digital music should circumstances arise
      that compromise our ability to protect and steward the integrity of our
      work.
    </p>
  </div>
);

export const metadata = {
  title: 'About',
};

export default About;
