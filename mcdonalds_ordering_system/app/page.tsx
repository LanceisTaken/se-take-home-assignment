"use client";

import React, { useState, useEffect, useRef } from 'react';

interface Order {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE';
  botId?: number; // Track which bot is processing this order
  isVIP: boolean; // Flag to identify VIP orders
  progress?: number; // Cooking progress (0-100)
  startTime?: number; // When the order started processing
  animation?: string; // Animation state for transitions
}

interface Bot {
  id: number;
  status: 'IDLE' | 'PROCESSING';
  processingOrderId?: number;
}

// Interface to track processing timeouts
interface ProcessingTimeouts {
  [key: string]: NodeJS.Timeout;
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [bots, setBots] = useState<Bot[]>([]);
  const [nextBotId, setNextBotId] = useState(1);
  
  // Use a ref to track timeouts so we can clear them when needed
  const timeoutsRef = useRef<ProcessingTimeouts>({});

  // Update progress for orders that are processing
  useEffect(() => {
    // Only run if there are processing orders
    const processingOrders = orders.filter(order => order.status === 'PROCESSING');
    if (processingOrders.length === 0) return;
    
    // Setup interval to update progress
    const intervalId = setInterval(() => {
      setOrders(currentOrders => 
        currentOrders.map(order => {
          if (order.status === 'PROCESSING' && order.startTime) {
            const elapsedTime = Date.now() - order.startTime;
            const progress = Math.min(Math.floor((elapsedTime / 10000) * 100), 100);
            return { ...order, progress };
          }
          return order;
        })
      );
    }, 100); // Update every 100ms for smooth animation
    
    return () => clearInterval(intervalId);
  }, [orders]);

  // Add animation to newly created or updated orders
  const addAnimationToOrder = (order: Order, animationType: string): Order => {
    return { ...order, animation: animationType };
  };

  // Clear animation after it completes
  useEffect(() => {
    const animatedOrders = orders.filter(order => order.animation);
    if (animatedOrders.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      setOrders(currentOrders => 
        currentOrders.map(order => order.animation ? { ...order, animation: undefined } : order)
      );
    }, 600); // Match this with the CSS animation duration
    
    return () => clearTimeout(timeoutId);
  }, [orders]);

  const addNormalOrder = () => {
    const newOrder: Order = {
      id: nextOrderId,
      status: 'PENDING',
      isVIP: false,
      animation: 'new'
    };
    setOrders(prevOrders => [...prevOrders, newOrder]);
    setNextOrderId(prevId => prevId + 1);
  };

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
        // Find first pending normal order index
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

  const cancelOrder = (orderId: number) => {
    // Find the order to cancel
    const orderToCancel = orders.find(order => order.id === orderId);
    
    if (!orderToCancel) return;
    
    // If the order is being processed, we need to free the bot
    if (orderToCancel.status === 'PROCESSING' && orderToCancel.botId) {
      // Clear any timeout for this order
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
    
    // Add a "removing" animation to the order being cancelled
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, animation: 'removing' } 
          : order
      )
    );
    
    // Actually remove the order after animation completes
    setTimeout(() => {
      // Remove the order from the orders list
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    }, 300);
  };

  const addBot = () => {
    const newBot: Bot = {
      id: nextBotId,
      status: 'IDLE'
    };
    setBots(prevBots => [...prevBots, newBot]);
    setNextBotId(prevId => prevId + 1);
  };

  const removeBot = () => {
    if (bots.length === 0) return;
    
    // Get the newest bot (last in the array)
    const botToRemove = bots[bots.length - 1];
    
    // If the bot is processing an order, return that order to PENDING
    if (botToRemove.status === 'PROCESSING' && botToRemove.processingOrderId) {
      // Clear the timeout for this bot-order combination
      const timeoutKey = `bot-${botToRemove.id}-order-${botToRemove.processingOrderId}`;
      if (timeoutsRef.current[timeoutKey]) {
        clearTimeout(timeoutsRef.current[timeoutKey]);
        delete timeoutsRef.current[timeoutKey];
      }
      
      // Return the order to PENDING status
      setOrders(prevOrders => {
        const orderToReturn = prevOrders.find(
          o => o.id === botToRemove.processingOrderId
        );
        
        if (!orderToReturn) return prevOrders;
        
        // Create a copy with the order back to PENDING status
        const updatedOrders = prevOrders.filter(
          o => o.id !== botToRemove.processingOrderId
        );
        
        // Reset progress and start time, add animation
        const returnedOrder = { 
          ...orderToReturn, 
          status: 'PENDING' as const, 
          botId: undefined, 
          progress: undefined, 
          startTime: undefined,
          animation: 'return-to-pending'
        };
        
        // Find where to insert the returned order based on VIP status
        if (returnedOrder.isVIP) {
          // For VIP orders, find the position after last VIP order or at beginning
          const lastVIPIndex = [...updatedOrders]
            .reverse()
            .findIndex(order => order.isVIP && order.status === 'PENDING');
          
          if (lastVIPIndex === -1) {
            // No VIP orders, insert before first normal pending
            const firstNormalPendingIndex = updatedOrders.findIndex(
              order => !order.isVIP && order.status === 'PENDING'
            );
            
            if (firstNormalPendingIndex === -1) {
              // No pending orders, just append the returned order
              return [...updatedOrders, returnedOrder];
            }
            
            // Insert before first normal order
            return [
              ...updatedOrders.slice(0, firstNormalPendingIndex),
              returnedOrder,
              ...updatedOrders.slice(firstNormalPendingIndex)
            ];
          }
          
          // Convert reverse index to actual index from the end
          const insertIndex = updatedOrders.length - lastVIPIndex;
          
          // Insert after the last VIP order
          return [
            ...updatedOrders.slice(0, insertIndex),
            returnedOrder,
            ...updatedOrders.slice(insertIndex)
          ];
        } else {
          // For normal orders, just append to the end
          return [...updatedOrders, returnedOrder];
        }
      });
    }
    
    // Remove the bot
    setBots(prevBots => prevBots.slice(0, -1));
  };

  // Process orders with available bots
  useEffect(() => {
    // Find idle bots
    const idleBots = bots.filter(bot => bot.status === 'IDLE');
    
    // Find pending orders, giving priority to VIP orders
    const pendingOrders = orders.filter(order => order.status === 'PENDING');
    // Separate VIP and normal orders, with VIP first
    const prioritizedOrders = [
      ...pendingOrders.filter(order => order.isVIP),
      ...pendingOrders.filter(order => !order.isVIP)
    ];
    
    // If there are idle bots and pending orders, assign orders to bots
    if (idleBots.length > 0 && prioritizedOrders.length > 0) {
      // Assign the first pending order to the first idle bot
      const bot = idleBots[0];
      const order = prioritizedOrders[0];
      
      // Update bot status
      setBots(prevBots => 
        prevBots.map(b => 
          b.id === bot.id 
            ? { ...b, status: 'PROCESSING', processingOrderId: order.id } 
            : b
        )
      );
      
      // Update order status and set start time
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
      
      // Create a timeout key for this bot-order combination
      const timeoutKey = `bot-${bot.id}-order-${order.id}`;
      
      // Clear any existing timeout for this order (shouldn't happen but just in case)
      if (timeoutsRef.current[timeoutKey]) {
        clearTimeout(timeoutsRef.current[timeoutKey]);
      }
      
      // Process the order (takes 10 seconds)
      timeoutsRef.current[timeoutKey] = setTimeout(() => {
        // Validity check: ensure the bot still exists and is still processing this order
        setBots(currentBots => {
          // Find the current state of the bot
          const currentBot = currentBots.find(b => b.id === bot.id);
          
          // Only update if the bot exists and is still processing this order
          if (currentBot && currentBot.status === 'PROCESSING' && currentBot.processingOrderId === order.id) {
            
            // Update the order to complete
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
            
            // Return updated bots array with this bot set to IDLE
            return currentBots.map(b => 
              b.id === bot.id 
                ? { ...b, status: 'IDLE', processingOrderId: undefined } 
                : b
            );
          }
          
          // If conditions aren't met, return bots unchanged
          return currentBots;
        });
        
        // Remove the timeout reference
        delete timeoutsRef.current[timeoutKey];
      }, 10000); // 10 seconds
    }
  }, [orders, bots]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const pendingOrders = orders.filter(order => order.status === 'PENDING');
  const processingOrders = orders.filter(order => order.status === 'PROCESSING');
  const completeOrders = orders.filter(order => order.status === 'COMPLETE');

  return (
    <div className="container mx-auto p-4 font-sans bg-gray-900 min-h-screen text-white">
      <style jsx global>{`
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
        
        @keyframes highlight {
          0% { background-color: rgba(234, 179, 8, 0.8); }
          100% { background-color: transparent; }
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
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-400">McDonald's Order System</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* PENDING Area */}
        <div className="border border-gray-700 rounded-lg p-6 bg-gray-800 shadow-lg transition-all duration-300 hover:shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-400">PENDING Orders</h2>
            <div className="flex gap-2">
              <button
                onClick={addNormalOrder}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-1 px-3 rounded-lg text-sm shadow-md transition-all duration-150 ease-in-out transform hover:scale-105"
              >
                New Normal Order
              </button>
              
              <button
                onClick={addVIPOrder}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-3 rounded-lg text-sm shadow-md transition-all duration-150 ease-in-out transform hover:scale-105"
              >
                New VIP Order
              </button>
            </div>
          </div>
          
          {pendingOrders.length === 0 ? (
            <p className="text-center text-gray-400 italic">No pending orders.</p>
          ) : (
            <ul className="text-gray-200 space-y-3">
              {pendingOrders.map(order => (
                <li 
                  key={order.id} 
                  className={`flex items-center justify-between border-b border-gray-700 pb-2 transition-all ${
                    order.animation ? `order-${order.animation}` : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span className="font-medium">Order #{order.id}</span>
                    {order.isVIP && <span className="ml-2 text-amber-400 font-bold">(VIP)</span>}
                  </div>
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-2 py-1 rounded transition-colors"
                    aria-label={`Cancel order ${order.id}`}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* COMPLETE Area */}
        <div className="border border-green-700 rounded-lg p-6 bg-green-900 shadow-lg transition-all duration-300 hover:shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-center text-green-300">COMPLETE Orders</h2>
          {completeOrders.length === 0 ? (
            <p className="text-center text-gray-400 italic">No completed orders.</p>
          ) : (
            <ul className="text-green-200 space-y-3">
              {completeOrders.map(order => (
                <li 
                  key={order.id} 
                  className={`flex justify-between border-b border-green-800 pb-2 ${
                    order.animation ? `order-${order.animation}` : ''
                  }`}
                >
                  <div>
                    <span className="font-medium">Order #{order.id}</span>
                    {order.isVIP && <span className="ml-2 text-amber-400 font-bold">(VIP)</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bot Status Area */}
      <div className="border border-blue-700 rounded-lg p-6 bg-blue-900 shadow-lg transition-all duration-300 hover:shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-300">Cooking Bots</h2>
          <div className="flex gap-2">
            <button
              onClick={addBot}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg text-sm shadow-md transition-all duration-150 ease-in-out transform hover:scale-105"
            >
              + Bot
            </button>
            
            <button
              onClick={removeBot}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded-lg text-sm shadow-md transition-all duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              disabled={bots.length === 0}
            >
              - Bot
            </button>
          </div>
        </div>
        
        {bots.length === 0 ? (
          <p className="text-center text-gray-400 italic">No bots available. Add a bot to start processing orders.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {bots.map(bot => (
              <div 
                key={bot.id} 
                className={`p-3 rounded-lg text-center transition-all duration-300 transform hover:scale-105 ${
                  bot.status === 'IDLE' 
                    ? 'bg-gray-700 border border-gray-600' 
                    : 'bg-yellow-800 border border-yellow-600 animate-pulse'
                }`}
              >
                <div className="font-bold">Bot #{bot.id}</div>
                <div className={`text-sm ${bot.status === 'IDLE' ? 'text-gray-300' : 'text-yellow-300'}`}>
                  {bot.status === 'IDLE' ? 'IDLE' : `Processing Order #${bot.processingOrderId}`}
                </div>
                {bot.status === 'PROCESSING' && (
                  <div className="mt-1 w-full bg-gray-700 rounded-full h-1 overflow-hidden">
                    <div className="bg-yellow-400 h-1 animate-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processing Orders Area with progress bars */}
      {processingOrders.length > 0 && (
        <div className="mt-6 border border-yellow-700 rounded-lg p-6 bg-yellow-900 shadow-lg transition-all duration-300 hover:shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-center text-yellow-300">Processing Orders</h2>
          <div className="space-y-6">
            {processingOrders.map(order => (
              <div key={order.id} className={`mb-4 ${order.animation ? `order-${order.animation}` : ''}`}>
                <div className="flex justify-between mb-1 items-center">
                  <div>
                    <span className="font-medium">Order #{order.id}</span>
                    {order.isVIP && <span className="ml-2 text-amber-400 font-bold">(VIP)</span>}
                    <span className="ml-2 text-sm text-gray-300">Bot #{order.botId}</span>
                  </div>
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-2 py-1 rounded transition-colors"
                    aria-label={`Cancel order ${order.id}`}
                  >
                    Cancel
                  </button>
                </div>
                
                {/* Progress bar container with animated shine effect */}
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden relative">
                  {/* Progress bar */}
                  <div 
                    className="bg-yellow-400 h-4 rounded-full transition-all duration-100 ease-linear"
                    style={{ width: `${order.progress || 0}%` }}
                  >
                    {/* Shine effect */}
                    <div className="absolute top-0 left-0 w-20 h-full transform -skew-x-30 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine"></div>
                  </div>
                </div>
                
                {/* Progress percentage and time left */}
                <div className="flex justify-between text-sm mt-1">
                  <div>
                    {/* Calculate remaining time in seconds */}
                    {order.progress !== undefined && 
                      `${Math.ceil(10 - (order.progress / 10))} seconds left`
                    }
                  </div>
                  <div>{order.progress || 0}% complete</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
