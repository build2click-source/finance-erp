import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const SettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  gstin: z.string().length(15).optional().or(z.literal('')),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  pincode: z.string().max(10).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  invoicePrefix: z.string().max(20).optional(),
  invoiceStartNo: z.string().max(10).optional(),
  footerNote: z.string().max(500).optional(),
  bankDetails: z.string().max(1000).optional(),
});


function parsePrefs(notes: string | null) {
  if (!notes) return { invoicePrefix: 'INV', invoiceStartNo: '001', footerNote: '', bankDetails: '' };
  try {
    return JSON.parse(notes);
  } catch {
    return { invoicePrefix: 'INV', invoiceStartNo: '001', footerNote: notes, bankDetails: '' };
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    let profile = await prisma.companyProfile.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!profile) {
      return NextResponse.json({ success: true, data: null });
    }

    const prefs = parsePrefs((profile as any).notes || null);

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        name: profile.name,
        gstin: profile.gstin,
        state: profile.state,
        city: profile.city,
        address: profile.address,
        pincode: profile.pincode,
        email: profile.email,
        phone: profile.phone,
        invoicePrefix: prefs.invoicePrefix,
        invoiceStartNo: prefs.invoiceStartNo,
        footerNote: prefs.footerNote,
        bankDetails: prefs.bankDetails,
      },
    });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const parseResult = SettingsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Validation failed', issues: parseResult.error.issues }, { status: 400 });
    }
    const {
      name, gstin, state, city, address, pincode, email, phone,
      invoicePrefix, invoiceStartNo, footerNote, bankDetails,
    } = parseResult.data;

    let profile = await prisma.companyProfile.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    const currentPrefs = parsePrefs((profile as any)?.notes || null);
    const newPrefs = JSON.stringify({
      invoicePrefix: invoicePrefix ?? currentPrefs.invoicePrefix,
      invoiceStartNo: invoiceStartNo ?? currentPrefs.invoiceStartNo,
      footerNote: footerNote ?? currentPrefs.footerNote,
      bankDetails: bankDetails ?? currentPrefs.bankDetails,
    });

    const profileData = {
      name: name ?? profile?.name ?? 'My Company',
      gstin: gstin ?? profile?.gstin,
      state: state ?? profile?.state,
      city: city ?? profile?.city,
      address: address ?? profile?.address,
      pincode: pincode ?? profile?.pincode,
      email: email ?? profile?.email,
      phone: phone ?? profile?.phone,
    };

    // Store doc prefs in the notes field as JSON
    const dataWithNotes = { ...profileData, notes: newPrefs } as any;

    if (profile) {
      profile = await prisma.companyProfile.update({
        where: { id: profile.id },
        data: dataWithNotes,
      });
    } else {
      profile = await prisma.companyProfile.create({
        data: dataWithNotes,
      });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
