# Physics working grader

This self-hosted service recognizes handwritten working with Pix2Text and scores the transcription with Laya. The browser displays the OCR result for correction before sending it to Laya. The service does not save answer images or transcripts.

## Run locally

Open `.env` in this directory and paste your key after `GROQ_API_KEY=`. Then, with Docker Desktop installed, run `docker compose up --build` from this directory. The key is only passed into the backend container; never put it in the web app or commit `.env`. The first start downloads the Pix2Text OCR models and Laya ONNX model, so it needs an internet connection and substantial disk space. Laya's published weights are about 1.7 GB and need roughly 2 GB of RAM while loaded. The grader listens on port 8788; the OCR service is private to the Compose network.

For local browser testing, set `VITE_PHYSICS_GRADER_URL=http://localhost:8788` in the web app's `.env.local`, then restart the Vite server. For a deployed website, build with `VITE_PHYSICS_GRADER_URL` set to the HTTPS URL of this service and set `FRONTEND_ORIGIN=https://hs-isadev.github.io` in the service environment. GitHub Pages hosts only the static website; it does not run this model service.

Before making the service public, put it behind HTTPS and add rate limiting / abuse protection at the host. The current CORS setting is a browser boundary, not authentication. Requests are size-limited; user images and transcriptions are processed in memory and not written to disk.

## Marking

The final numeric answer is checked deterministically. Laya scores the method against the question's worked solution and separately estimates whether the expected unit is present. The result is out of five: two for the final answer, up to two for method, and one for units. The OCR transcription is editable because handwriting recognition can misread symbols. Laya returns rubric probabilities rather than prose; when `GROQ_API_KEY` is set, Groq receives the question, OCR transcription, expected solution, and existing marks to write concise feedback. Groq cannot change the score. If Groq is not configured or its request fails, fixed feedback is used and grading still succeeds.

Pix2Text is MIT-licensed. The `@receptron/laya` runtime is MIT-licensed and the published Laya model weights are Apache-2.0; retain their notices if redistributing this service.
