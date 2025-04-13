# McDonald's Order System Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Requirements and User Stories](#requirements-and-user-stories)
3. [Technical Architecture](#technical-architecture)
4. [Setup and Running the Application](#setup-and-running-the-application)
5. [Core Components](#core-components)
6. [Key Functions and Logic](#key-functions-and-logic)
7. [UI Implementation](#ui-implementation)
8. [Animation and Visual Feedback](#animation-and-visual-feedback)
9. [Testing and Future Improvements](#testing-and-future-improvements)

## Project Overview

The McDonald's Order System is a React-based application designed to manage and visualize the flow of food orders in a McDonald's restaurant. The system implements an automated cooking bot system that processes orders based on priority and availability, creating a streamlined and efficient ordering experience.

The application was built using Next.js with React and TypeScript, utilizing modern practices such as functional components, React hooks, and a clean, component-based architecture. The UI was designed with Tailwind CSS to create a responsive and visually appealing interface.

## Requirements and User Stories

The application was developed to fulfill the following core requirements:

1. **Normal Customer Orders**: When a customer submits an order, it appears in the "PENDING" area and moves to "COMPLETE" after processing.

2. **VIP Order Priority**: VIP customer orders are processed before normal customer orders, but queue behind existing VIP orders.

3. **Bot Management**: Managers can increase or decrease the number of cooking bots. Adding a bot immediately processes pending orders, while removing a bot returns its processing order to the pending queue.

4. **Order Processing**: Each bot can only process one order at a time, and each order takes 10 seconds to complete.

5. **Order Flow**: Orders follow a clear progression from PENDING to PROCESSING to COMPLETE states, with appropriate visual feedback.

6. **Multiple User Views**: The system provides different views for Managers, Regular Customers, and VIP Customers.

## Technical Architecture

### Technology Stack
- **Frontend**: React, Next.js, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect, useRef)
- **Build Tools**: Next.js built-in tooling

### Main Components
- **Home Component**: The main container component that manages the entire application state
- **Order Management System**: Handles order creation, processing, and completion
- **Bot Management System**: Controls the addition, removal, and assignment of cooking bots
- **View Management**: Manages different views for different user types (Manager, Customer, VIP Customer)

### Data Models

The application uses two main data models:

#### Order Interface
```typescript
interface Order {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE';
  botId?: number;
  isVIP: boolean;
  progress?: number;
  startTime?: number;
  animation?: string;
}
```

#### Bot Interface
```typescript
interface Bot {
  id: number;
  status: 'IDLE' | 'PROCESSING';
  processingOrderId?: number;
}
```

## Setup and Running the Application

### Prerequisites
- Node.js (v16.x or higher recommended)
- npm (v7.x or higher) or Yarn (v1.22.x or higher)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/mcdonalds-ordering-system.git
cd mcdonalds-ordering-system
```

2. Install dependencies
```bash
# Using npm
npm install

# Using Yarn
yarn
```

### Running the Development Server

To start the development server:
```bash
# Using npm
npm run dev

# Using Yarn
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

To create a production build:
```bash
# Using npm
npm run build
npm start

# Using Yarn
yarn build
yarn start
```

### Project Structure
```
mcdonalds_ordering_system/
├── app/                # Next.js app directory
│   └── page.tsx        # Main application component
├── public/             # Static assets
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project README
```

## Core Components

### Order Management System

The order management system handles the creation, progression, and completion of orders. It maintains orders in three states:

1. **PENDING**: New orders awaiting processing
2. **PROCESSING**: Orders currently being processed by a bot
3. **COMPLETE**: Orders that have been successfully processed

#### Order Prioritization

VIP orders are given priority over normal orders. When a VIP order is added, the system inserts it after existing VIP orders but before normal orders:

```typescript
const addVIPOrder = () => {
  const newOrder: Order = {
    id: nextOrderId,
    status: 'PENDING',
    isVIP: true,
    animation: 'new'
  };
  
  // Insert the VIP order after all existing VIP orders but before normal orders
  setOrders(prevOrders => {
    // Find the index of the last VIP order
    const lastVIPIndex = [...prevOrders]
      .reverse()
      .findIndex(order => order.isVIP && order.status === 'PENDING');
    
    // If no VIP orders found, insert at the beginning of pending orders
    if (lastVIPIndex === -1) {
      const firstNormalPendingIndex = prevOrders.findIndex(
        order => !order.isVIP && order.status === 'PENDING'
      );
      
      if (firstNormalPendingIndex === -1) {
        // No pending normal orders, just append
        return [...prevOrders, newOrder];
      }
      
      // Insert before the first normal pending order
      return [
        ...prevOrders.slice(0, firstNormalPendingIndex),
        newOrder,
        ...prevOrders.slice(firstNormalPendingIndex)
      ];
    }
    
    // Convert reverse index to actual index from the end
    const insertIndex = prevOrders.length - lastVIPIndex;
    
    // Insert after the last VIP order
    return [
      ...prevOrders.slice(0, insertIndex),
      newOrder,
      ...prevOrders.slice(insertIndex)
    ];
  });
  
  setNextOrderId(prevId => prevId + 1);
};
```

### Bot Management System

The bot management system handles the creation, assignment, and removal of cooking bots:

#### Adding a Bot

```typescript
const addBot = () => {
  const newBot: Bot = {
    id: nextBotId,
    status: 'IDLE'
  };
  setBots(prevBots => [...prevBots, newBot]);
  setNextBotId(prevId => prevId + 1);
};
```

#### Removing a Bot

```typescript
const removeBot = () => {
  if (bots.length === 0) return;
  
  const botToRemove = bots[bots.length - 1];
  
  if (botToRemove.status === 'PROCESSING' && botToRemove.processingOrderId) {
    // Clear the timeout for this bot-order combination
    const timeoutKey = `bot-${botToRemove.id}-order-${botToRemove.processingOrderId}`;
    if (timeoutsRef.current[timeoutKey]) {
      clearTimeout(timeoutsRef.current[timeoutKey]);
      delete timeoutsRef.current[timeoutKey];
    }
    
    // Return the order to PENDING status with appropriate placement
    setOrders(prevOrders => {
      // Find order being processed by this bot
      const orderToReturn = prevOrders.find(
        o => o.id === botToRemove.processingOrderId
      );
      
      if (!orderToReturn) return prevOrders;
      
      // Reset order to pending state
      // ...implementation details for re-adding to queue based on VIP status
    });
  }
  
  // Remove the bot (always the newest one)
  setBots(prevBots => prevBots.slice(0, -1));
};
```

### View Management

The application supports three different views:

1. **Manager View**: Full control over orders and bots
2. **Customer View**: Limited view for normal customers
3. **VIP Customer View**: Limited view for VIP customers

This is managed using a `ViewMode` type and a state variable:

```typescript
type ViewMode = 'MANAGER' | 'CUSTOMER' | 'VIP_CUSTOMER';
const [viewMode, setViewMode] = useState<ViewMode>('MANAGER');
```

## Key Functions and Logic

### Order-Bot Assignment

The system automatically assigns idle bots to pending orders, prioritizing VIP orders:

```typescript
const assignOrderToBot = (bot: Bot, order: Order) => {
  // Update bot status to PROCESSING
  setBots(prevBots => 
    prevBots.map(b => 
      b.id === bot.id 
        ? { ...b, status: 'PROCESSING', processingOrderId: order.id } 
        : b
    )
  );
  
  // Update order status to PROCESSING with animation
  setOrders(prevOrders => 
    prevOrders.map(o => 
      o.id === order.id 
        ? { 
            ...o, 
            status: 'PROCESSING', 
            botId: bot.id,
            progress: 0,
            startTime: Date.now(),
            animation: 'start-processing'
          } 
        : o
    )
  );
  
  // Set timeout to complete the order after cooking time
  const timeoutKey = `bot-${bot.id}-order-${order.id}`;
  timeoutsRef.current[timeoutKey] = setTimeout(() => {
    handleOrderComplete(bot, order, timeoutKey);
  }, COOKING_TIME_MS);
};
```

### Order Progress Tracking

The system updates the progress of orders in real-time:

```typescript
useEffect(() => {
  const processingOrders = orders.filter(order => order.status === 'PROCESSING');
  if (processingOrders.length === 0) return;
  
  const intervalId = setInterval(() => {
    setOrders(currentOrders => 
      currentOrders.map(order => {
        if (order.status === 'PROCESSING' && order.startTime) {
          const elapsedTime = Date.now() - order.startTime;
          const progress = Math.min(Math.floor((elapsedTime / COOKING_TIME_MS) * 100), 100);
          return { ...order, progress };
        }
        return order;
      })
    );
  }, PROGRESS_UPDATE_INTERVAL_MS);
  
  return () => clearInterval(intervalId);
}, [orders]);
```

### Order Completion

When an order is complete, the system marks it as complete and frees the bot:

```typescript
const handleOrderComplete = (bot: Bot, order: Order, timeoutKey: string) => {
  setBots(currentBots => {
    const currentBot = currentBots.find(b => b.id === bot.id);
    
    if (currentBot && currentBot.status === 'PROCESSING' && currentBot.processingOrderId === order.id) {
      // Mark order as complete with animation
      setOrders(currentOrders => 
        currentOrders.map(o => 
          o.id === order.id && o.status === 'PROCESSING' && o.botId === bot.id
            ? { 
                ...o, 
                status: 'COMPLETE', 
                botId: undefined,
                progress: undefined,
                startTime: undefined,
                animation: 'complete'
              } 
            : o
        )
      );
      
      // Set bot back to IDLE
      return currentBots.map(b => 
        b.id === bot.id 
          ? { ...b, status: 'IDLE', processingOrderId: undefined } 
          : b
      );
    }
    
    return currentBots;
  });
  
  // Clean up the timeout
  delete timeoutsRef.current[timeoutKey];
};
```

### Order Cancellation

Orders can be cancelled in both PENDING and PROCESSING states:

```typescript
const cancelOrder = (orderId: number) => {
  const orderToCancel = orders.find(order => order.id === orderId);
  
  if (!orderToCancel) return;
  
  // If the order is being processed, free the bot
  if (orderToCancel.status === 'PROCESSING' && orderToCancel.botId) {
    const timeoutKey = `bot-${orderToCancel.botId}-order-${orderId}`;
    if (timeoutsRef.current[timeoutKey]) {
      clearTimeout(timeoutsRef.current[timeoutKey]);
      delete timeoutsRef.current[timeoutKey];
    }
    
    // Set the bot back to IDLE
    setBots(prevBots => 
      prevBots.map(bot => 
        bot.id === orderToCancel.botId 
          ? { ...bot, status: 'IDLE', processingOrderId: undefined } 
          : bot
      )
    );
  }
  
  // Add a "removing" animation to the order
  setOrders(prevOrders => 
    prevOrders.map(order => 
      order.id === orderId 
        ? { ...order, animation: 'removing' } 
        : order
    )
  );
  
  // Actually remove the order after animation completes
  setTimeout(() => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
  }, ORDER_REMOVAL_ANIMATION_MS);
};
```

## UI Implementation

The UI is implemented using Tailwind CSS with a responsive design that adapts to different screen sizes. The application is divided into different views:

### Manager View

The Manager View provides full control over the ordering system:
- Create normal and VIP orders
- View all pending, processing, and completed orders
- Add and remove cooking bots
- Cancel orders in any state
- Monitor bot status and cooking progress

### Customer Views

Two customer views are provided:
1. **Regular Customer View**: Simplified interface for normal customers
2. **VIP Customer View**: Specialized interface for VIP customers

Both customer views offer limited functionality:
- Place new orders (regular or VIP depending on the view)
- View orders in preparation
- View completed orders ready for pickup

The customer views do not allow order cancellation or bot management.

### View Toggle System

The application implements a tab system for switching between views:

```typescript
const renderTabButtons = () => (
  <div className="flex space-x-2">
    <button
      onClick={() => toggleView('MANAGER')}
      className={`px-4 py-2 rounded-lg transition-all ${
        viewMode === 'MANAGER' 
          ? 'bg-red-600 text-white cursor-default opacity-90'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
      disabled={viewMode === 'MANAGER'}
      aria-pressed={viewMode === 'MANAGER'}
    >
      Manager
    </button>
    <button
      onClick={() => toggleView('CUSTOMER')}
      className={`px-4 py-2 rounded-lg transition-all ${
        viewMode === 'CUSTOMER' 
          ? 'bg-yellow-500 text-black cursor-default opacity-90'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
      disabled={viewMode === 'CUSTOMER'}
      aria-pressed={viewMode === 'CUSTOMER'}
    >
      Customer
    </button>
    <button
      onClick={() => toggleView('VIP_CUSTOMER')}
      className={`px-4 py-2 rounded-lg transition-all ${
        viewMode === 'VIP_CUSTOMER' 
          ? 'bg-amber-600 text-white cursor-default opacity-90'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
      disabled={viewMode === 'VIP_CUSTOMER'}
      aria-pressed={viewMode === 'VIP_CUSTOMER'}
    >
      VIP Customer
    </button>
  </div>
);
```

## Animation and Visual Feedback

The application uses CSS animations to provide visual feedback for various state changes:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(20px); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes slideIn {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

.order-new {
  animation: fadeIn 0.5s ease-out;
}

.order-removing {
  animation: fadeOut 0.3s ease-in forwards;
}

.order-complete {
  animation: pulse 0.6s ease-in-out;
}

.order-start-processing {
  animation: slideOut 0.5s ease-in-out;
}

.order-return-to-pending {
  animation: slideIn 0.5s ease-in-out;
}
```

These animations are applied to orders at different stages:
- **New order**: Fade in animation
- **Order to processing**: Slide out animation
- **Order complete**: Pulse animation
- **Order cancellation**: Fade out animation
- **Order returned to pending**: Slide in animation

### Progress Bar

Processing orders show a visual progress bar that updates in real-time:

```jsx
<div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden relative">
  <div 
    className="bg-yellow-400 h-4 rounded-full transition-all duration-100 ease-linear"
    style={{ width: `${order.progress || 0}%` }}
  >
    <div className="absolute top-0 left-0 w-20 h-full transform -skew-x-30 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine"></div>
  </div>
</div>

<div className="flex justify-between text-sm mt-1">
  <div>
    {order.progress !== undefined && 
      `${Math.ceil(10 - (order.progress / 10))} seconds left`
    }
  </div>
  <div>{order.progress || 0}% complete</div>
</div>
```

## Testing and Future Improvements

### Testing
The application should be thoroughly tested for:
- **Functional testing**: Verify all features work as expected
- **Edge cases**: Test behavior with many orders, bots, and various combinations
- **Performance testing**: Ensure smooth operation even with a large number of orders
- **Usability testing**: Verify the UI is intuitive and user-friendly

### Potential Improvements
- **Persistent Storage**: Add option for data persistence using local storage or a backend database
- **Authentication**: Implement user authentication to differentiate between customer types
- **Real-time Updates**: Implement WebSockets for multi-user real-time updates
- **Order Details**: Add more details to orders (items, quantities, customizations)
- **Statistics**: Add analytics and reporting features for managers
- **Mobile App**: Create a dedicated mobile application for customers and staff
- **Kitchen Display System**: Enhance the system to function as a full kitchen display system
- **Integration**: Connect with POS systems and other restaurant management tools

## Conclusion

The McDonald's Order System successfully implements the core requirements of an automated cooking system for order management. The application provides different views for different user types, prioritizes VIP orders, and gives managers control over the cooking bots. The system includes visual feedback through animations and progress bars, creating an engaging and informative user experience. 