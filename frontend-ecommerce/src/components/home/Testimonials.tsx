'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const testimonials = [
  {
    id: 1,
    name: 'João da Silva',
    role: 'Customer from Dili',
    avatar: '',
    rating: 5,
    content:
      "E-commerce Timor-Leste has completely transformed my shopping experience. I can find everything I need from local sellers. The delivery is always on time!",
  },
  {
    id: 2,
    name: 'Maria Guterres',
    role: 'Seller from Baucau',
    avatar: '',
    rating: 5,
    content:
      "As a seller, this platform has helped me reach customers across Timor-Leste. The process is simple and the support team is always helpful.",
  },
  {
    id: 3,
    name: 'Antonio Belo',
    role: 'Customer from Same',
    avatar: '',
    rating: 4,
    content:
      "I love the variety of products available. From electronics to local crafts, everything is just a click away. Highly recommended!",
  },
  {
    id: 4,
    name: 'Lucia dos Santos',
    role: 'Customer from Oecusse',
    avatar: '',
    rating: 5,
    content:
      "Finally an online marketplace that works for Timor-Leste! The user interface is great and the customer service is excellent.",
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setVisibleCount(1);
      else if (window.innerWidth < 1024) setVisibleCount(2);
      else setVisibleCount(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      prev + visibleCount >= testimonials.length ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev - 1 < 0 ? Math.max(0, testimonials.length - visibleCount) : prev - 1
    );
  };

  const visibleTestimonials = testimonials.slice(
    currentIndex,
    currentIndex + visibleCount
  );

  return (
    <section className="section-spacing">
      <div className="container-custom">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold sm:text-3xl">What Our Customers Say</h2>
          <p className="text-muted-foreground mt-1">
            Real reviews from real people
          </p>
        </div>

        <div className="relative">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTestimonials.map((testimonial) => (
              <Card key={testimonial.id} className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar>
                      <AvatarImage src={testimonial.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {testimonial.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < testimonial.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-muted-foreground flex-1">
                    "{testimonial.content}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {testimonials.length > visibleCount && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="icon"
                onClick={prevSlide}
                className="h-9 w-9 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextSlide}
                className="h-9 w-9 rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}