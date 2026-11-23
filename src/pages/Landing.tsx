export default function Landing() {
  return (
    <div className="landing">
      <div className="pill on">
        <span className="dot" /> GenHacks 2026 · open source · works in your browser
      </div>
      <h1>
        Draw<span className="scribble">Anything</span>
      </h1>
      <p className="tagline">
        Draw a control desk on plain paper. Scan it once with your phone.
        The ink <b>works</b> — live, under your laptop webcam.
      </p>

      <div className="hero-row">
        <a className="btn primary" href="#/play">▶&nbsp; Play on this laptop</a>
        <a className="btn go" href="#/scan">📷&nbsp; Scan a drawing (phone)</a>
      </div>
      <p className="doodle">no app to install · no special paper · just a pen ✎</p>

      <div className="steps">
        <div className="step frame">
          <div className="num">one —</div>
          <h3>Draw your desk</h3>
          <p>
            A slider for volume. Boxes for drum pads. A circle for a bottle-cap
            dial. A few letter keys. If you can draw it in a box, it can work.
          </p>
        </div>
        <div className="step frame">
          <div className="num">two —</div>
          <h3>Scan it once</h3>
          <p>
            Hold your phone over the page for one photo. AI reads every control
            and hands the layout to your laptop as a QR code. Phone goes away.
          </p>
        </div>
        <div className="step frame">
          <div className="num">three —</div>
          <h3>Tap the ink</h3>
          <p>
            Prop the sheet up facing your webcam and play it: drums thump,
            the slider rides, keys type. Draw a brand-new MUTE box mid-song —
            it comes alive in seconds.
          </p>
        </div>
      </div>

      <p className="footer-note">
        <b>How it decides a “touch”:</b> your webcam tracks your fingertip on the
        paper; a real tap is a fast approach that stops dead on the ink with the
        fingertip covering the spot. Hovering never fires — the panel of three
        AIs that designed this engine argued about it for three rounds so you
        don't have to. Everything runs locally on your laptop; only the one-time
        scan photo is sent for labeling.{" "}
        <a href="https://github.com/DhyeyPatel007/drawanything" target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
        .
      </p>
    </div>
  );
}
