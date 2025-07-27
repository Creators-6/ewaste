# AI-Powered E-Waste Awareness and Recycling Platform

## Overview

This project is an AI-powered e-waste awareness and recycling platform developed by **Team Creators**. The platform bridges the gap between individuals looking to dispose of e-waste responsibly and organizations committed to collecting and recycling it. It features a dual interface—one for users and another for organizations—facilitating seamless communication and sustainable action.

This is our Youtube video Demo link : 
https://youtu.be/09IBYvcPZxQ?si=P4y-0wHx8J1jUgyY

## Features

### User Dashboard

- **Simple Sign Up/Login**  
  Users can easily create an account or log in using an intuitive interface.

- **E-Waste Image Upload**  
  Users can upload images of e-waste items such as broken phones, chargers, or earphones.

- **AI-Based Image Analysis**  
  Uploaded images are analyzed using **Gemini 1.5 Flash** to detect and classify the type of e-waste. The system provides important details such as:
  - Identification of item type  
  - Harmful material information  
  - Safe disposal guidelines

- **Recycling Requests**  
  Users can opt to send the item for recycling. Their details—name, contact, and item information—are securely shared with verified organizations.

- **Eco-Points System**  
  Users earn eco-points for each successful recycling action, promoting responsible behavior through gamification.

- **Status Updates**  
  Users can track the status of their submissions (pending, accepted, scheduled, recycled) on the **Recent Items** page.

---

### Organization Dashboard

- **Organization Login Portal**  
  Verified organizations have a dedicated login interface.

- **Request Management**  
  The dashboard lists all incoming recycling requests, including:
  - Uploaded image  
  - User details  
  - Current status (e.g., pending, recycled)  
  - Contact information

- **Request Actions**  
  Organizations can:
  - Accept or reject submissions  
  - Schedule pickups  
  - Mark recycling as completed  
  - Send status updates to users

- **Real-Time Notifications**  
  Organizations and users both receive notifications when actions are taken or statuses change.

---

## Tech Stack

- **Frontend**: React with Vite for a fast and responsive UI  
- **Styling**: Standard CSS  
- **Authentication**: Firebase Authentication  
- **Database**: Firebase Firestore  
- **Image Storage**: Cloudinary  
- **AI Integration**: Gemini 1.5 Flash for image classification and analysis

---

## Use Cases

This system is ideal for deployment in:

- Schools and Colleges  
- Residential Communities  
- Tech Parks and Offices  

It serves as a scalable solution to promote environmental responsibility and awareness of e-waste disposal.
