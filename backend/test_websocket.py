#!/usr/bin/env python3

import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws/discussion/3/"
    
    try:
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Wait for connection established message
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📨 Received: {data}")
            
            # Send a test message
            test_message = {
                "type": "chat_message",
                "content": "Test message from Python script"
            }
            
            await websocket.send(json.dumps(test_message))
            print("📤 Sent test message")
            
            # Wait for response
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📨 Response: {data}")
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ Connection closed: {e}")
    except websockets.exceptions.InvalidHandshake as e:
        print(f"❌ Invalid handshake: {e}")
    except ConnectionRefusedError:
        print("❌ Connection refused - is the server running?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🧪 Testing WebSocket connection...")
    asyncio.run(test_websocket()) 