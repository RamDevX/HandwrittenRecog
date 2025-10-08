import React, { useRef, useState } from "react";
import axios from "axios";

const Canvas = () => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [prediction, setPrediction] = useState(null);

  // Start drawing
  const handleMouseDown = (e) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 6;       // thinner strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";  // smooth joins
    ctx.strokeStyle = "black";

    isDrawing.current = true;

    const rect = canvasRef.current.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  // Clear canvas
  const handleClear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setPrediction(null);
  };

  // Preprocess canvas to 28x28, crop, center, invert colors
  const preprocessImage = () => {
    const originalCanvas = canvasRef.current;
    const ctx = originalCanvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const data = imgData.data;

    // Find bounding box of the drawn digit
    let minX = originalCanvas.width, minY = originalCanvas.height;
    let maxX = 0, maxY = 0;
    for (let y = 0; y < originalCanvas.height; y++) {
      for (let x = 0; x < originalCanvas.width; x++) {
        const i = (y * originalCanvas.width + x) * 4;
        const brightness = data[i] + data[i + 1] + data[i + 2];
        if (brightness < 750) { // anything not white
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX > maxX || minY > maxY) return originalCanvas.toDataURL("image/png"); // empty canvas

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = 28;
    tmpCanvas.height = 28;
    const tmpCtx = tmpCanvas.getContext("2d");

    // Scale and center the digit
    const scale = 20 / Math.max(boxWidth, boxHeight);
    const offsetX = (28 - boxWidth * scale) / 2;
    const offsetY = (28 - boxHeight * scale) / 2;

    tmpCtx.drawImage(
      originalCanvas,
      minX, minY, boxWidth, boxHeight,
      offsetX, offsetY, boxWidth * scale, boxHeight * scale
    );

    // Invert colors
    const tmpData = tmpCtx.getImageData(0, 0, 28, 28);
    for (let i = 0; i < tmpData.data.length; i += 4) {
      tmpData.data[i] = 255 - tmpData.data[i];       // R
      tmpData.data[i + 1] = 255 - tmpData.data[i + 1]; // G
      tmpData.data[i + 2] = 255 - tmpData.data[i + 2]; // B
    }
    tmpCtx.putImageData(tmpData, 0, 0);

    return tmpCanvas.toDataURL("image/png");
  };

  // Predict digit
  const handlePredict = async () => {
    const dataUrl = preprocessImage();
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/predict/", {
        image: dataUrl,
      });
      setPrediction(res.data);
    } catch (err) {
      console.error(err);
      alert("Prediction failed!");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h2>Draw a digit (0-9)</h2>
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        style={{ border: "2px solid black", background: "white" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      ></canvas>
      <div style={{ marginTop: "10px" }}>
        <button onClick={handleClear}>Clear</button>
        <button onClick={handlePredict} style={{ marginLeft: "10px" }}>
          Predict
        </button>
      </div>
      {prediction && (
        <div style={{ marginTop: "20px", fontSize: "24px" }}>
          Predicted Digit: <b>{prediction.digit}</b> <br />
          Confidence: <b>{(prediction.confidence * 100).toFixed(2)}%</b>
        </div>
      )}
    </div>
  );
};

export default Canvas;
