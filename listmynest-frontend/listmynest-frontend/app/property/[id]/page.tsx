"use client";

import { useParams } from "next/navigation";

import { PropertyDetailClient } from "../../../components/property/PropertyDetailClient";

export default function PropertyPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params.id ?? ""));
  return <PropertyDetailClient propertyId={id} />;
}
