
# Live Notepad for Multiple Devices

## Overview

This project allows users to share and edit data across multiple devices in real-time. The goal is to enable live collaboration on notes, where any update made on one device is reflected instantly on all connected devices.

## Technologies Used

- **Express**: A web framework for Node.js, used to build the server-side functionality.
- **JWT (JSON Web Tokens)**: For user authentication and session management.
- **Bcrypt.js**: A library for hashing passwords for secure storage.
- **CORS**: Used to enable cross-origin requests, allowing the server to interact with different devices.
- **Body-parser**: Middleware to parse incoming request bodies in a middleware before handling them.
- **Mongoose**: MongoDB object modeling for Node.js, used to interact with the MongoDB database.
- **Socket.IO**: Enables real-time, bidirectional communication between the server and the clients (i.e., devices).

## Features

- **Real-Time Updates**: Changes made to the notepad are broadcasted to all connected devices instantly.
- **Cross-Device Sync**: Edit notes on one device, and all others will reflect the changes live.
- **User Authentication**: Secure login and registration using JWT.
- **Cloud-Based Storage**: Notes are stored in a MongoDB database, accessible from any device.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/live-notepad.git
   cd live-notepad
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your MongoDB database. You can use a cloud service like MongoDB Atlas or set up a local instance.


4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser and visit `http://localhost:3000` to start using the live notepad.

## Usage

- Once the server is running, you can access the notepad via any browser.
- Users can log in and begin editing the notepad.
- All connected users will see the changes live.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
