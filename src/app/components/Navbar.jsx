'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignInButton, SignedIn, SignedOut, UserButton, useClerk } from '@clerk/nextjs'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { signOut } = useClerk() // Get the actual signOut function from Clerk

  const toggleMenu = () => setIsOpen(!isOpen)

  const handleSignOut = async () => {
    await signOut(() => router.push('/')) // Logs out then sends user to home
  }

  return (
    <>
      <nav className='w-full h-32 flex items-center justify-center relative px-10 border-b border-gray-50 bg-white z-30'>
        {/* Logo */}
        <h1 
          onClick={() => router.push('/')} 
          className='cursor-pointer text-4xl font-bold text-gray-800 select-none'
        >
          <span>Expense</span><span className='text-amber-500'>Tracker</span>
        </h1>

        {/* Right Side Actions */}
        <div className='absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-4 md:gap-6'>
          
          <SignedIn>
            {/* Improved Profile Layout */}
            <div className="flex items-center gap-4">
              <div className="border-2 border-amber-500 p-0.5 rounded-full hover:shadow-md transition-all flex items-center justify-center">
                <UserButton 
                  afterSignOutUrl="/" 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-10 h-10",
                      userButtonPopoverCard: "shadow-2xl border border-gray-100",
                      userButtonTrigger: "focus:shadow-none focus:outline-none"
                    }
                  }}
                />
              </div>

              {/* Hamburger Menu Container */}
              <div className="relative">
                <button 
                  onClick={toggleMenu} 
                  className='flex items-center justify-center gap-1.5 flex-col w-10 h-10 rounded-xl hover:bg-gray-50 transition-all active:scale-90'
                >
                  <div className={`w-6 h-0.5 bg-gray-900 rounded-lg transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                  <div className={`w-6 h-0.5 bg-gray-900 rounded-lg transition-all duration-200 ${isOpen ? 'opacity-0' : ''}`}></div>
                  <div className={`w-6 h-0.5 bg-gray-900 rounded-lg transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
                </button>

                {/* Dropdown Menu */}
                <div 
                  className={`absolute right-0 top-full mt-5 w-60 bg-white border border-gray-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-top-right z-50 ${
                    isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
                  }`}
                >
                  <div className="px-4 py-3 bg-gray-50/50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Navigation</p>
                  </div>
                  <button 
                    onClick={() => { router.push('/history'); setIsOpen(false); }} 
                    className='px-6 py-4 text-left text-gray-700 hover:bg-amber-50 hover:text-amber-600 font-semibold transition-all'
                  >
                    Financial History
                  </button>
                  
                  <div className='border-t border-gray-100 bg-gray-50/30 p-2'>
                    <button 
                      onClick={handleSignOut} 
                      className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className='bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg shadow-amber-200 active:scale-95'>
                Sign In
              </button>
            </SignInButton>
          </SignedOut>

        </div>
      </nav>
      
      {/* Background Overlay */}
      {isOpen && (
        <div 
          className='fixed inset-0 bg-white/40 backdrop-blur-sm z-20' 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  )
}

export default Navbar