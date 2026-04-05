import { prisma } from '../db';
import { z } from 'zod';
import { updateProfileSchema, foundationPreferencesSchema } from '../schemas/member';

export class MemberService {
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberProfile: {
          include: {
            foundationPreferences: true,
          }
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // If member profile doesn't exist, create a default one
    if (!user.memberProfile && user.userType === 'MEMBER') {
      return await this.createDefaultProfile(userId);
    }

    return user.memberProfile;
  }

  static async createDefaultProfile(userId: string) {
    return await prisma.memberProfile.create({
      data: {
        userId,
        phone: '',
        bio: '',
      },
      include: {
        foundationPreferences: true,
      }
    });
  }

  /**
   * Get foundation preferences for a user
   */
  static async getFoundationPreferences(userId: string) {
    const profile = await prisma.memberProfile.findUnique({
      where: { userId },
      include: {
        foundationPreferences: true,
      },
    });

    if (!profile) {
      return null;
    }

    const prefs = profile.foundationPreferences;
    if (!prefs) {
      return {
        businessFoundation: false,
        legalStartups: false,
        businessFormation: false,
        basicAccountingBudget: false,
        mortgagesHomeOwnership: false,
        investingStocks: false,
        preciousMetals: false,
        financialWellbeing: false,
        enableJobAlerts: true,
        enablePreApply: false,
        preApplyLocations: [],
        preApplyEmployment: [],
        preApplySalaryMin: null,
        preApplySalaryMax: null,
        preApplyIndustries: [],
      };
    }

    return {
      ...prefs,
      preApplyLocations: prefs.preApplyLocations ? JSON.parse(prefs.preApplyLocations) : [],
      preApplyEmployment: prefs.preApplyEmployment ? JSON.parse(prefs.preApplyEmployment) : [],
      preApplyIndustries: prefs.preApplyIndustries ? JSON.parse(prefs.preApplyIndustries) : [],
    };
  }

  /**
   * Update foundation preferences for a user
   */
  static async updateFoundationPreferences(
    userId: string, 
    data: z.infer<typeof foundationPreferencesSchema>
  ) {
    // Ensure member profile exists
    let profile = await prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.memberProfile.create({
        data: { userId, phone: '', bio: '' },
      });
    }

    // Upsert foundation preferences
    const prefs = await prisma.memberFoundationPreference.upsert({
      where: { memberId: profile.id },
      create: {
        memberId: profile.id,
        businessFoundation: data.businessFoundation ?? false,
        legalStartups: data.legalStartups ?? false,
        businessFormation: data.businessFormation ?? false,
        basicAccountingBudget: data.basicAccountingBudget ?? false,
        mortgagesHomeOwnership: data.mortgagesHomeOwnership ?? false,
        investingStocks: data.investingStocks ?? false,
        preciousMetals: data.preciousMetals ?? false,
        financialWellbeing: data.financialWellbeing ?? false,
        enableJobAlerts: data.enableJobAlerts ?? true,
        enablePreApply: data.enablePreApply ?? false,
        preApplyLocations: data.preApplyLocations ? JSON.stringify(data.preApplyLocations) : null,
        preApplyEmployment: data.preApplyEmployment ? JSON.stringify(data.preApplyEmployment) : null,
        preApplySalaryMin: data.preApplySalaryMin,
        preApplySalaryMax: data.preApplySalaryMax,
        preApplyIndustries: data.preApplyIndustries ? JSON.stringify(data.preApplyIndustries) : null,
      },
      update: {
        businessFoundation: data.businessFoundation,
        legalStartups: data.legalStartups,
        businessFormation: data.businessFormation,
        basicAccountingBudget: data.basicAccountingBudget,
        mortgagesHomeOwnership: data.mortgagesHomeOwnership,
        investingStocks: data.investingStocks,
        preciousMetals: data.preciousMetals,
        financialWellbeing: data.financialWellbeing,
        enableJobAlerts: data.enableJobAlerts,
        enablePreApply: data.enablePreApply,
        preApplyLocations: data.preApplyLocations ? JSON.stringify(data.preApplyLocations) : undefined,
        preApplyEmployment: data.preApplyEmployment ? JSON.stringify(data.preApplyEmployment) : undefined,
        preApplySalaryMin: data.preApplySalaryMin,
        preApplySalaryMax: data.preApplySalaryMax,
        preApplyIndustries: data.preApplyIndustries ? JSON.stringify(data.preApplyIndustries) : undefined,
        updatedAt: new Date(),
      },
    });

    // Also update NotificationPreference jobAlerts flag if enableJobAlerts changed
    if (data.enableJobAlerts !== undefined) {
      await prisma.notificationPreference.updateMany({
        where: { userId },
        data: { jobAlerts: data.enableJobAlerts },
      });
    }

    return {
      ...prefs,
      preApplyLocations: prefs.preApplyLocations ? JSON.parse(prefs.preApplyLocations) : [],
      preApplyEmployment: prefs.preApplyEmployment ? JSON.parse(prefs.preApplyEmployment) : [],
      preApplyIndustries: prefs.preApplyIndustries ? JSON.parse(prefs.preApplyIndustries) : [],
    };
  }

  static async updateProfile(userId: string, data: z.infer<typeof updateProfileSchema>['body']) {
    // Ensure profile exists
    let profile = await prisma.memberProfile.findUnique({ where: { userId } });
    if (!profile) {
      await this.createDefaultProfile(userId);
    }

    // Update basic fields
    const updatedProfile = await prisma.memberProfile.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return updatedProfile;
  }

  static async getApplications(userId: string) {
    return await prisma.jobApplication.findMany({
      where: { userId },
      include: {
        job: {
          include: {
            user: {
              include: {
                companyProfile: {
                  select: { companyName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
