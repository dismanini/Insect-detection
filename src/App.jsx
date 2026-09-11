import { useEffect, useRef, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const animationRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState("Ready to scan");
  const [confidence, setConfidence] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const [error, setError] = useState("");

  // Load AI model
  useEffect(() => {
    async function loadModel() {
      try {
        const model = await cocoSsd.load();
        modelRef.current = model;
        setModelLoaded(true);
      } catch (err) {
        console.error(err);
        setError("Unable to load AI model.");
      }
    }

    loadModel();

    return () => {
      stopCamera();
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraStarted(true);
      setResult("Camera ready");
    } catch (err) {
      console.error(err);

      setError(
        "Camera permission was denied or the camera is unavailable."
      );
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraStarted(false);
    setScanning(false);
  };

  // Draw camera frame
  const drawFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );
  };

  // Capture image
  const captureImage = () => {
    drawFrame();

    setResult("Image captured");
  };

  // Scan using the available model
  const scanCamera = async () => {
    if (!modelRef.current) {
      setError("AI model is still loading.");
      return;
    }

    if (!videoRef.current) {
      return;
    }

    setScanning(true);
    setResult("Scanning...");
    setConfidence(0);
    setDetectionCount(0);

    try {
      const predictions = await modelRef.current.detect(
        videoRef.current
      );

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(
        videoRef.current,
        0,
        0,
        canvas.width,
        canvas.height
      );

      /*
        IMPORTANT:

        COCO-SSD does NOT have a bed-bug class.

        This demo draws detected objects only to demonstrate
        the detection pipeline.

        Replace this section with your custom bed-bug model
        for real bed-bug detection.
      */

      const validPredictions = predictions.filter(
        (prediction) => prediction.score >= 0.5
      );

      validPredictions.forEach((prediction) => {
        const [x, y, width, height] =
          prediction.bbox;

        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 4;

        ctx.strokeRect(
          x,
          y,
          width,
          height
        );

        ctx.fillStyle = "#00ff88";
        ctx.font = "18px Arial";

        ctx.fillText(
          `${prediction.class} ${Math.round(
            prediction.score * 100
          )}%`,
          x,
          y > 25 ? y - 8 : y + 20
        );
      });

      setDetectionCount(validPredictions.length);

      if (validPredictions.length > 0) {
        const highestConfidence = Math.max(
          ...validPredictions.map(
            (item) => item.score
          )
        );

        setConfidence(
          Math.round(highestConfidence * 100)
        );

        setResult(
          "Object detected — not confirmed as a bed bug"
        );
      } else {
        setResult("No detectable object found");
      }
    } catch (err) {
      console.error(err);
      setError("Scanning failed.");
    }

    setScanning(false);
  };

  return (
    <div className="app">

      {/* Header */}

      <header className="header">
        <div className="logo">
          <span className="bug-icon">🐞</span>

          <div>
            <h1>BedBug AI</h1>
            <p>Smart Camera Detection</p>
          </div>
        </div>

        <div className="status">
          <span
            className={
              modelLoaded
                ? "status-dot online"
                : "status-dot"
            }
          ></span>

          {modelLoaded
            ? "AI Ready"
            : "Loading AI..."}
        </div>
      </header>

      {/* Main */}

      <main className="main">

        <section className="hero">

          <div className="hero-text">

            <span className="badge">
              AI POWERED INSPECTION
            </span>

            <h2>
              Detect unwanted
              <span> bed bugs</span>
            </h2>

            <p>
              Use your camera to inspect mattresses,
              beds, furniture and other areas for
              possible insect activity.
            </p>

          </div>

          {/* Scanner */}

          <div className="scanner-card">

            <div className="camera-container">

              {!cameraStarted && (
                <div className="camera-placeholder">

                  <div className="camera-icon">
                    📷
                  </div>

                  <h3>
                    Camera not started
                  </h3>

                  <p>
                    Start your camera to begin
                    inspection.
                  </p>

                </div>
              )}

              <video
                ref={videoRef}
                className={
                  cameraStarted
                    ? "camera-video"
                    : "camera-video hidden"
                }
                playsInline
                muted
              />

              <canvas
                ref={canvasRef}
                className="detection-canvas"
              />

              {cameraStarted && (
                <div className="scan-overlay">

                  <div className="corner top-left"></div>
                  <div className="corner top-right"></div>
                  <div className="corner bottom-left"></div>
                  <div className="corner bottom-right"></div>

                  {scanning && (
                    <div className="scan-line"></div>
                  )}

                  <div className="scan-label">
                    {scanning
                      ? "SCANNING..."
                      : "POSITION AREA INSIDE FRAME"}
                  </div>

                </div>
              )}

            </div>

            {/* Result */}

            <div className="result-panel">

              <div className="result-main">

                <div className="result-icon">
                  {result.includes("not confirmed")
                    ? "⚠️"
                    : result.includes("No")
                    ? "✓"
                    : "🔍"}
                </div>

                <div>
                  <small>SCAN RESULT</small>

                  <h3>
                    {result}
                  </h3>
                </div>

              </div>

              <div className="stats">

                <div>
                  <strong>
                    {confidence}%
                  </strong>

                  <span>
                    Confidence
                  </span>
                </div>

                <div>
                  <strong>
                    {detectionCount}
                  </strong>

                  <span>
                    Objects
                  </span>
                </div>

              </div>

            </div>

            {/* Controls */}

            <div className="controls">

              {!cameraStarted ? (
                <button
                  className="primary-button"
                  onClick={startCamera}
                >
                  📷 Start Camera
                </button>
              ) : (
                <>
                  <button
                    className="primary-button"
                    onClick={scanCamera}
                    disabled={scanning}
                  >
                    {scanning
                      ? "Scanning..."
                      : "🔍 Scan Area"}
                  </button>

                  <button
                    className="secondary-button"
                    onClick={captureImage}
                  >
                    📸 Capture
                  </button>

                  <button
                    className="stop-button"
                    onClick={stopCamera}
                  >
                    Stop
                  </button>
                </>
              )}

            </div>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

          </div>

        </section>

        {/* How it works */}

        <section className="how-section">

          <div className="section-title">

            <span>HOW IT WORKS</span>

            <h2>
              Inspect in three simple steps
            </h2>

          </div>

          <div className="steps">

            <div className="step">

              <div className="step-number">
                01
              </div>

              <div className="step-icon">
                📷
              </div>

              <h3>
                Start Camera
              </h3>

              <p>
                Allow camera access and point
                your camera at the area you want
                to inspect.
              </p>

            </div>

            <div className="step">

              <div className="step-number">
                02
              </div>

              <div className="step-icon">
                🔍
              </div>

              <h3>
                Scan Area
              </h3>

              <p>
                Capture a clear view of the
                mattress, furniture or other
                inspection area.
              </p>

            </div>

            <div className="step">

              <div className="step-number">
                03
              </div>

              <div className="step-icon">
                📊
              </div>

              <h3>
                View Result
              </h3>

              <p>
                The AI model analyzes the image
                and displays detected objects.
              </p>

            </div>

          </div>

        </section>

        {/* Areas */}

        <section className="areas">

          <div>
            <span>RECOMMENDED AREAS</span>

            <h2>
              Where should you scan?
            </h2>
          </div>

          <div className="area-grid">

            <div className="area-card">
              <span>🛏️</span>
              <h3>Mattress</h3>
              <p>
                Inspect seams, edges and folds.
              </p>
            </div>

            <div className="area-card">
              <span>🛋️</span>
              <h3>Furniture</h3>
              <p>
                Check sofa seams and corners.
              </p>
            </div>

            <div className="area-card">
              <span>🪵</span>
              <h3>Bed Frame</h3>
              <p>
                Inspect joints and cracks.
              </p>
            </div>

            <div className="area-card">
              <span>🔎</span>
              <h3>Other Areas</h3>
              <p>
                Check cracks and hidden spaces.
              </p>
            </div>

          </div>

        </section>

      </main>

      <footer>
        <p>
          BedBug AI • AI-assisted visual inspection
        </p>

        <p className="disclaimer">
          AI results are estimates and should not
          replace professional pest inspection.
        </p>
      </footer>

    </div>
  );
}

export default App;