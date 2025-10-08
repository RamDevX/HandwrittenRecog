from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import numpy as np
from PIL import Image
import io
import base64
import tensorflow as tf

# Load model globally
model = tf.keras.models.load_model('api/model/cnn_model.h5')

class PredictDigit(APIView):
    def post(self, request):
        try:
            # Get base64 image from request
            data = request.data.get('image')
            image_data = base64.b64decode(data.split(',')[1])
            image = Image.open(io.BytesIO(image_data)).convert('L')  # grayscale
            image = image.resize((28,28))
            image = np.array(image)/255.0
            image = image.reshape(1,28,28,1)

            # Predict
            prediction = model.predict(image)
            digit = int(np.argmax(prediction))
            confidence = float(np.max(prediction))

            return Response({'digit': digit, 'confidence': confidence}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
