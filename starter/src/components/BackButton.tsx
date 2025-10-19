'use client';

import { ArrowLeft } from 'lucide-react'; // npm i lucide-react
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'; // npm i @/components/ui/button

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer"
      onClick={() => router.push("/")}
    >
      <ArrowLeft className="h-5 w-5" />
      <span>Back</span>
    </Button>
  );
} 