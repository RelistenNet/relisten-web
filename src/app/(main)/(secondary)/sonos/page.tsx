const Sonos = () => (
  <div>
    <h1>Sonos</h1>

    <p>
      HOME TEAM fm is available for use on all Sonos devices. Enjoy your concertos in the comfort of
      your home.
    </p>

    <h3>Installation</h3>

    <p>
      Open your Sonos application and go to <strong>Add Music Services</strong> and search for{' '}
      <strong>HOME TEAM fm</strong>. Easy as pie.
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
  title: 'Sonos',
};

export default Sonos;
