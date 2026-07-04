# OpenCV face service

This private service uses OpenCV YuNet for single-face detection and SFace for
128-dimensional embeddings. It does not store source images.

## Local run

```bash
docker build -t orga-face-service face_service
docker run --rm -p 8000:8000 \
  -e FACE_RECOGNITION_SERVICE_KEY=change-me \
  orga-face-service
```

Configure the Node backend with the service URL and the same secret:

```env
FACE_RECOGNITION_SERVICE_URL=http://localhost:8000
FACE_RECOGNITION_SERVICE_KEY=change-me
FACE_MATCH_THRESHOLD=0.42
```

For production, deploy this Docker directory to a container host. Vercel's Node
function cannot run the Python OpenCV process alongside Express.

The repository includes a root `render.yaml` for a Render Blueprint deployment.
After deployment, copy its generated `FACE_RECOGNITION_SERVICE_KEY` and public
service URL into the corresponding Vercel backend environment variables.
