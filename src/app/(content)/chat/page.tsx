const Chat = () => (
  <div>
    <h1>Chat</h1>

    <p>We have a Discord to provide feedback, report bugs, or recommend a jam.</p>

    <a
      className="button mt-0"
      href="https://discordapp.com/invite/73fdDSS"
      target="_blank"
      rel="noreferrer"
    >
      Please Join Us!
    </a>
    <p className="text-muted-foreground italic text-sm">
      Relisten is open source. If you are interested in contributing code to Relisten, please join
      the #new-contributors channel.
    </p>
  </div>
);

export const metadata = {
  title: 'Chat',
};

export default Chat;
