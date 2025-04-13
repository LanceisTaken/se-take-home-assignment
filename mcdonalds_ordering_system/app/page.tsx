"use client";

import React, { useState, useEffect, useRef } from 'react';

// Interfaces and Types
interface Order {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE';
  botId?: number;
  isVIP: boolean;
  progress?: number;
  startTime?: number;
  animation?: string;
}

interface Bot {
  id: number;
  status: 'IDLE' | 'PROCESSING';
  processingOrderId?: number;
}

interface ProcessingTimeouts {
  [key: string]: NodeJS.Timeout;
}

type ViewMode = 'MANAGER' | 'CUSTOMER' | 'VIP_CUSTOMER';

// Constants
const COOKING_TIME_MS = 10000; // 10 seconds
const ANIMATION_DURATION_MS = 600;
const PROGRESS_UPDATE_INTERVAL_MS = 100;
const ORDER_REMOVAL_ANIMATION_MS = 300;

export default function Home() {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('MANAGER');
  const [orders, setOrders] = useState<Order[]>([]);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [bots, setBots] = useState<Bot[]>([]);
  const [nextBotId, setNextBotId] = useState(1);
  
  // Refs
  const timeoutsRef = useRef<ProcessingTimeouts>({});

  // Derived state
  const pendingOrders = orders.filter(order => order.status === 'PENDING');
  const processingOrders = orders.filter(order => order.status === 'PROCESSING');
  const completeOrders = orders.filter(order => order.status === 'COMPLETE');

  // Order status update effect
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

  // Animation cleanup effect
  useEffect(() => {
    const animatedOrders = orders.filter(order => order.animation);
    if (animatedOrders.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      setOrders(currentOrders => 
        currentOrders.map(order => order.animation ? { ...order, animation: undefined } : order)
      );
    }, ANIMATION_DURATION_MS);
    
    return () => clearTimeout(timeoutId);
  }, [orders]);

  // Order processing effect
  useEffect(() => {
    const idleBots = bots.filter(bot => bot.status === 'IDLE');
    
    const pendingOrders = orders.filter(order => order.status === 'PENDING');
    const prioritizedOrders = [
      ...pendingOrders.filter(order => order.isVIP),
      ...pendingOrders.filter(order => !order.isVIP)
    ];
    
    if (idleBots.length > 0 && prioritizedOrders.length > 0) {
      assignOrderToBot(idleBots[0], prioritizedOrders[0]);
    }
  }, [orders, bots]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  // Helper functions
  const getCustomerPendingOrders = (isVIP: boolean) => {
    return [
      ...pendingOrders.filter(order => order.isVIP === isVIP),
      ...processingOrders.filter(order => order.isVIP === isVIP)
    ];
  };

  const getCustomerCompleteOrders = (isVIP: boolean) => {
    return completeOrders.filter(order => order.isVIP === isVIP);
  };

  const toggleView = (mode: ViewMode) => {
    if (viewMode !== mode) {
      setViewMode(mode);
    }
  };

  const assignOrderToBot = (bot: Bot, order: Order) => {
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
    
    // Process order timeout
    const timeoutKey = `bot-${bot.id}-order-${order.id}`;
    
    if (timeoutsRef.current[timeoutKey]) {
      clearTimeout(timeoutsRef.current[timeoutKey]);
    }
    
    timeoutsRef.current[timeoutKey] = setTimeout(() => {
      handleOrderComplete(bot, order, timeoutKey);
    }, COOKING_TIME_MS);
  };

  const handleOrderComplete = (bot: Bot, order: Order, timeoutKey: string) => {
    setBots(currentBots => {
      const currentBot = currentBots.find(b => b.id === bot.id);
      
      if (currentBot && currentBot.status === 'PROCESSING' && currentBot.processingOrderId === order.id) {
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
        
        return currentBots.map(b => 
          b.id === bot.id 
            ? { ...b, status: 'IDLE', processingOrderId: undefined } 
            : b
        );
      }
      
      return currentBots;
    });
    
    delete timeoutsRef.current[timeoutKey];
  };

  // Order actions
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
    const orderToCancel = orders.find(order => order.id === orderId);
    
    if (!orderToCancel) return;
    
    if (orderToCancel.status === 'PROCESSING' && orderToCancel.botId) {
      const timeoutKey = `bot-${orderToCancel.botId}-order-${orderId}`;
      if (timeoutsRef.current[timeoutKey]) {
        clearTimeout(timeoutsRef.current[timeoutKey]);
        delete timeoutsRef.current[timeoutKey];
      }
      
      setBots(prevBots => 
        prevBots.map(bot => 
          bot.id === orderToCancel.botId 
            ? { ...bot, status: 'IDLE', processingOrderId: undefined } 
            : bot
        )
      );
    }
    
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, animation: 'removing' } 
          : order
      )
    );
    
    setTimeout(() => {
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    }, ORDER_REMOVAL_ANIMATION_MS);
  };

  // Bot actions
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
    
    const botToRemove = bots[bots.length - 1];
    
    if (botToRemove.status === 'PROCESSING' && botToRemove.processingOrderId) {
      const timeoutKey = `bot-${botToRemove.id}-order-${botToRemove.processingOrderId}`;
      if (timeoutsRef.current[timeoutKey]) {
        clearTimeout(timeoutsRef.current[timeoutKey]);
        delete timeoutsRef.current[timeoutKey];
      }
      
      setOrders(prevOrders => {
        const orderToReturn = prevOrders.find(
          o => o.id === botToRemove.processingOrderId
        );
        
        if (!orderToReturn) return prevOrders;
        
        const updatedOrders = prevOrders.filter(
          o => o.id !== botToRemove.processingOrderId
        );
        
        const returnedOrder = { 
          ...orderToReturn, 
          status: 'PENDING' as const, 
          botId: undefined, 
          progress: undefined, 
          startTime: undefined,
          animation: 'return-to-pending'
        };
        
        // Determine insert position for returned order
        if (returnedOrder.isVIP) {
          const lastVIPIndex = [...updatedOrders]
            .reverse()
            .findIndex(order => order.isVIP && order.status === 'PENDING');
          
          if (lastVIPIndex === -1) {
            const firstNormalPendingIndex = updatedOrders.findIndex(
              order => !order.isVIP && order.status === 'PENDING'
            );
            
            if (firstNormalPendingIndex === -1) {
              return [...updatedOrders, returnedOrder];
            }
            
            return [
              ...updatedOrders.slice(0, firstNormalPendingIndex),
              returnedOrder,
              ...updatedOrders.slice(firstNormalPendingIndex)
            ];
          }
          
          const insertIndex = updatedOrders.length - lastVIPIndex;
          
          return [
            ...updatedOrders.slice(0, insertIndex),
            returnedOrder,
            ...updatedOrders.slice(insertIndex)
          ];
        } else {
          return [...updatedOrders, returnedOrder];
        }
      });
    }
    
    setBots(prevBots => prevBots.slice(0, -1));
  };
  
  // Render functions
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

  const renderCustomerView = (isVIP: boolean) => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <button
          onClick={isVIP ? addVIPOrder : addNormalOrder}
          className={`${isVIP 
            ? 'bg-amber-600 hover:bg-amber-700 text-white' 
            : 'bg-yellow-400 hover:bg-yellow-500 text-black'
          } font-bold py-2 px-6 rounded-lg text-lg shadow-md transition-all duration-150 ease-in-out transform hover:scale-105`}
        >
          Place {isVIP ? 'VIP ' : 'New '}Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* PENDING Area */}
        <div className={`border ${isVIP ? 'border-amber-700' : 'border-gray-700'} rounded-lg p-6 ${isVIP ? 'bg-amber-900/30' : 'bg-gray-800'} shadow-lg transition-all duration-300 hover:shadow-xl`}>
          <h2 className={`text-xl font-semibold mb-4 text-center ${isVIP ? 'text-amber-400' : 'text-yellow-400'}`}>
            Your {isVIP ? 'VIP ' : ''}Orders Being Prepared
          </h2>
          
          {getCustomerPendingOrders(isVIP).length === 0 ? (
            <p className="text-center text-gray-400 italic">No {isVIP ? 'VIP ' : ''}orders being prepared.</p>
          ) : (
            <ul className={`${isVIP ? 'text-amber-100' : 'text-gray-200'} space-y-3`}>
              {getCustomerPendingOrders(isVIP).map(order => (
                <li 
                  key={order.id} 
                  className={`flex items-center justify-between border-b ${isVIP ? 'border-amber-700/50' : 'border-gray-700'} pb-2 transition-all ${
                    order.animation ? `order-${order.animation}` : ''
                  }`}
                >
                  <div className="flex items-center w-full">
                    <span className="font-medium">{isVIP ? 'VIP ' : ''}Order #{order.id}</span>
                    <div className="ml-auto">
                      {order.status === 'PROCESSING' ? (
                        <span className="bg-amber-600 text-white px-2 py-1 rounded-full text-xs">
                          Being cooked
                        </span>
                      ) : (
                        <span className={`${isVIP ? 'bg-amber-700' : 'bg-gray-600'} text-white px-2 py-1 rounded-full text-xs`}>
                          {isVIP ? 'In priority queue' : 'In queue'}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* COMPLETE Area */}
        <div className="border border-green-700 rounded-lg p-6 bg-green-900 shadow-lg transition-all duration-300 hover:shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-center text-green-300">
            {isVIP ? 'VIP ' : ''}Orders Ready for Pickup
          </h2>
          {getCustomerCompleteOrders(isVIP).length === 0 ? (
            <p className="text-center text-gray-400 italic">No {isVIP ? 'VIP ' : ''}orders ready for pickup.</p>
          ) : (
            <ul className="text-green-200 space-y-3">
              {getCustomerCompleteOrders(isVIP).map(order => (
                <li 
                  key={order.id} 
                  className={`flex justify-between border-b border-green-800 pb-2 ${
                    order.animation ? `order-${order.animation}` : ''
                  }`}
                >
                  <div>
                    <span className="font-medium">{isVIP ? 'VIP ' : ''}Order #{order.id}</span>
                  </div>
                  <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs">
                    Ready!
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const renderManagerView = () => (
    <>
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

      {/* Processing Orders Area */}
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
                
                {/* Progress bar container */}
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
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

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
        {renderTabButtons()}
      </div>

      {viewMode === 'CUSTOMER' && renderCustomerView(false)}
      {viewMode === 'VIP_CUSTOMER' && renderCustomerView(true)}
      {viewMode === 'MANAGER' && renderManagerView()}
    </div>
  );
}
