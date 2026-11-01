import React, { useState } from 'react';
import { Package, Shield, BarChart3, Users, TrendingUp, Star } from 'lucide-react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';

type AuthView = 'login' | 'signup' | 'forgot-password';

const AuthPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>('login');

  const features = [
    {
      icon: Package,
      title: 'Smart Inventory Tracking',
      description: 'Real-time stock monitoring with automated alerts',
      highlight: 'Never run out of stock again'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive sales reports and business insights',
      highlight: 'Make data-driven decisions'
    },
    {
      icon: Users,
      title: 'Supplier Management',
      description: 'Streamline relationships and purchase orders',
      highlight: 'Optimize your supply chain'
    },
    {
      icon: TrendingUp,
      title: 'Business Growth',
      description: 'Tools and insights to scale your operations',
      highlight: 'Accelerate your success'
    },
  ];

  const testimonials = [
    {
      name: 'Kwame Asante',
      business: 'Asante Electronics',
      quote: 'Stoqu transformed how we manage inventory. Sales increased 40% in 3 months!',
      rating: 5
    },
    {
      name: 'Ama Osei',
      business: 'Osei Fashion House',
      quote: 'The best inventory system for Ghanaian businesses. Simple yet powerful.',
      rating: 5
    }
  ];

  const renderForm = () => {
    switch (currentView) {
      case 'login':
        return (
          <LoginForm
            onSwitchToSignup={() => setCurrentView('signup')}
            onForgotPassword={() => setCurrentView('forgot-password')}
          />
        );
      case 'signup':
        return <SignupForm onSwitchToLogin={() => setCurrentView('login')} />;
      case 'forgot-password':
        return <ForgotPasswordForm onBack={() => setCurrentView('login')} />;
      default:
        return null;
    }
  };

  const isSignup = currentView === 'signup';

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Side - Elegant Hero Section (HIDDEN ON MOBILE) */}
      <div className={`hidden lg:flex flex-col justify-center relative overflow-hidden transition-all duration-300 ${
        isSignup ? 'lg:w-2/5' : 'lg:w-1/2'
      }`}>
        {/* Sophisticated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-100/30 via-transparent to-transparent"></div>
        
        {/* Elegant Geometric Elements */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-gradient-to-tr from-green-100/30 to-emerald-100/30 rounded-full blur-2xl"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-br from-teal-100/20 to-emerald-100/20 rounded-full blur-xl"></div>
        
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1" fill="currentColor" className="text-emerald-600"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>
        
        <div className="relative z-10 px-8 xl:px-12 py-8 text-gray-800">
          <div className="max-w-xl xl:max-w-2xl mx-auto">
            {/* Elegant Logo and Brand */}
            <div className="text-left mb-8 xl:mb-12">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 xl:w-16 xl:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl xl:rounded-3xl flex items-center justify-center shadow-xl border border-emerald-100">
                  <Package className="w-6 h-6 xl:w-8 xl:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl xl:text-4xl font-bold tracking-tight bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                    Stoqu
                  </h1>
                  <p className="text-lg xl:text-xl text-emerald-600 font-medium">Smart Inventory Management</p>
                </div>
              </div>
              
              {/* Refined Tagline */}
              <div className="mb-8 xl:mb-12">
                <h2 className="text-2xl xl:text-3xl font-bold mb-3 xl:mb-4 leading-tight text-gray-800">
                  {isSignup ? (
                    <>Transform Your Business with <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Smart Technology</span></>
                  ) : (
                    <>Inventory Management <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Redefined</span></>
                  )}
                </h2>
                <p className="text-base xl:text-lg text-gray-600 leading-relaxed font-light">
                  {isSignup 
                    ? 'Join thousands of businesses streamlining their operations with our elegant platform. Experience sophisticated inventory management.'
                    : 'Harness the power of advanced analytics, real-time tracking, and intelligent automation with our beautifully designed solution.'
                  }
                </p>
              </div>
            </div>

            {/* Elegant Features Grid */}
            <div className={`grid grid-cols-1 ${isSignup ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-4 xl:gap-6 mb-8 xl:mb-12`}>
              {features.slice(0, isSignup ? 2 : 4).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="group">
                    <div className="flex items-start space-x-3 xl:space-x-4 p-4 xl:p-5 rounded-2xl bg-white/70 backdrop-blur-sm border border-emerald-100/50 hover:bg-white/90 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300">
                      <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
                        <Icon className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base xl:text-lg font-semibold mb-1 text-gray-800">{feature.title}</h3>
                        {!isSignup && (
                          <>
                            <p className="text-sm xl:text-sm text-gray-600 mb-2">{feature.description}</p>
                            <p className="text-xs xl:text-xs text-emerald-700 font-medium">{feature.highlight}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Refined Testimonials (only for login) */}
            {!isSignup && (
              <div className="mb-6 xl:mb-8">
                <h3 className="text-base xl:text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-800">
                  <Star className="w-4 h-4 xl:w-5 xl:h-5 text-amber-500" />
                  <span>Loved by 5,000+ Businesses</span>
                </h3>
                <div className="space-y-3 xl:space-y-4">
                  {testimonials.map((testimonial, index) => (
                    <div key={index} className="bg-white/70 backdrop-blur-sm border border-emerald-100/50 rounded-2xl p-4 xl:p-5 hover:bg-white/90 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300">
                      <div className="flex items-center space-x-1 mb-2">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 xl:w-4 xl:h-4 text-amber-500 fill-current" />
                        ))}
                      </div>
                      <p className="text-sm xl:text-sm text-gray-700 mb-2 italic font-light">"{testimonial.quote}"</p>
                      <div className="text-xs xl:text-xs">
                        <span className="font-medium text-gray-800">{testimonial.name}</span>
                        <span className="text-gray-500"> • {testimonial.business}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Elegant Security Badge */}
            <div className="flex items-center space-x-3 bg-white/70 backdrop-blur-sm border border-emerald-100/50 rounded-2xl p-4 xl:p-5 hover:bg-white/90 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300">
              <div className="w-5 h-5 xl:w-6 xl:h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-3 h-3 xl:w-4 xl:h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm xl:text-base text-gray-800">Enterprise-Grade Security</p>
                <p className="text-xs xl:text-sm text-gray-600">Bank-level encryption with 99.9% uptime guarantee</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className={`flex-1 flex items-center justify-center px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 bg-gray-50 transition-all duration-300 ${
        isSignup ? 'lg:w-3/5' : 'lg:w-1/2'
      }`}>
        <div className={`w-full ${isSignup ? 'max-w-4xl' : 'max-w-md'}`}>
          {/* Mobile Logo (ONLY SHOWN ON MOBILE) */}
          <div className="lg:hidden text-center mb-4 sm:mb-6 lg:mb-8">
            <div className="flex items-center justify-center space-x-3 mb-3 sm:mb-4">
              <div className="w-12 sm:w-14 h-12 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                  Stoqu
                </h1>
                <p className="text-sm sm:text-base text-emerald-600 font-medium">Smart Inventory Management</p>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-emerald-100/50 p-3 sm:p-4 md:p-6 lg:p-8">
            {renderForm()}
          </div>

          {/* Mobile Features (ONLY SHOWN ON MOBILE for login) */}
          {!isSignup && (
            <div className="lg:hidden mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
                Why Choose Stoqu?
              </h3>
              {features.slice(0, 2).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm border border-emerald-100/50">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{feature.title}</h4>
                      <p className="text-sm text-gray-600">{feature.highlight}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mobile Testimonial (ONLY SHOWN ON MOBILE for login) */}
          {!isSignup && (
            <div className="lg:hidden mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200/50">
              <div className="flex items-center space-x-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-500 fill-current" />
                ))}
              </div>
              <p className="text-sm text-gray-700 mb-2 font-light">
                "Stoqu helped us increase sales by 40% in just 3 months!"
              </p>
              <p className="text-xs text-gray-600">
                <span className="font-medium">Kwame Asante</span> • Asante Electronics
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;