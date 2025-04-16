import { createNotification } from "./notificationHelper.js";

import { PrismaClient, AccessType } from "@prisma/client";

const prisma = new PrismaClient();

export const requestRecommendation = async (req, res) => {
  try {
    const {
      processId,
      recommendedToId,
      remarks,
      documentSummaries = [],
      processSummary,
    } = req.body;

    const userData = req.user;

    const recommendation = await prisma.$transaction(async (tx) => {
      const newRec = await tx.processRecommendation.create({
        data: {
          processId,
          requestedById: userData.id,
          recommendedToId,
          remarks,
          status: "PENDING",
        },
        include: {
          process: {
            select: {
              name: true,
              workflow: { select: { name: true } },
            },
          },
        },
      });

      if (documentSummaries.length > 0) {
        await tx.recommendationDocumentSummary.createMany({
          data: documentSummaries.map((summary) => ({
            recommendationId: newRec.id,
            documentId: summary.documentId,
            summaryText: summary.summaryText,
          })),
        });
      }

      if (processSummary) {
        await tx.recommendationSummary.create({
          data: {
            recommendationId: newRec.id,
            summaryText: processSummary,
          },
        });
      }

      await createNotification(tx, {
        type: "RECOMMENDATION_REQUEST",
        userId: recommendedToId,
        recommendationId: newRec.id,
        metadata: {
          processId,
          processName: newRec.process.name,
          workflowName: newRec.process.workflow.name,
          requestedBy: {
            id: userData.id,
            name: userData.name,
            username: userData.username,
          },
        },
      });

      return await tx.processRecommendation.findUnique({
        where: { id: newRec.id },
        include: {
          requestedBy: {
            select: {
              id: true,
              name: true,
              username: true,
              signaturePicFileName: true,
            },
          },
          recommendedTo: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          process: {
            select: {
              id: true,
              name: true,
              workflow: { select: { name: true } },
            },
          },
          highlights: {
            include: {
              document: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  path: true,
                },
              },
            },
          },
          documentSummaries: {
            include: {
              document: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          processSummary: true,
        },
      });
    });

    res.status(201).json({
      success: true,
      data: recommendation,
      message: "Recommendation request sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Recommendation request failed",
        details: error.message,
        code: "RECOMMENDATION_CREATION_ERROR",
      },
    });
  }
};

export const requestRecommendationClarification = async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const { clarificationText } = req.body;
    const userData = req.user;

    const clarification = await prisma.$transaction(async (tx) => {
      const recommendation = await tx.processRecommendation.update({
        where: {
          id: recommendationId,
          recommendedToId: userData.id,
          status: "PENDING",
        },
        data: {
          status: "CLARIFICATION_REQUESTED",
          remarks: clarificationText,
        },
        include: {
          requestedBy: true,
        },
      });

      if (!recommendation) {
        throw new Error(
          "Recommendation not found or not eligible for clarification"
        );
      }

      await createNotification(tx, {
        type: "RECOMMENDATION_CLARIFICATION_REQUEST",
        userId: recommendation.requestedById,
        recommendationId,
        metadata: {
          requestedBy: {
            id: userData.id,
            name: userData.name,
            username: userData.username,
          },
          clarificationText,
        },
      });

      return recommendation;
    });

    res.status(200).json({
      success: true,
      data: clarification,
      message: "Clarification requested successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to request clarification",
        details: error.message,
        code: "CLARIFICATION_REQUEST_ERROR",
      },
    });
  }
};

export const respondToRecommendationClarification = async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const { responseText } = req.body;
    const userData = req.user;

    const response = await prisma.$transaction(async (tx) => {
      const recommendation = await tx.processRecommendation.update({
        where: {
          id: recommendationId,
          requestedById: userData.id,
          status: "CLARIFICATION_REQUESTED",
        },
        data: {
          status: "PENDING",
          remarks: responseText,
        },
        include: {
          recommendedTo: true,
        },
      });

      if (!recommendation) {
        throw new Error(
          "Recommendation not found or not in clarification requested state"
        );
      }

      await createNotification(tx, {
        type: "RECOMMENDATION_CLARIFICATION_RESPONSE",
        userId: recommendation.recommendedToId,
        recommendationId,
        metadata: {
          respondedBy: {
            id: userData.id,
            name: userData.name,
            username: userData.username,
          },
          responseText,
        },
      });

      return recommendation;
    });

    res.status(200).json({
      success: true,
      data: response,
      message: "Clarification response submitted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to respond to clarification",
        details: error.message,
        code: "CLARIFICATION_RESPONSE_ERROR",
      },
    });
  }
};

export const submitRecommendation = async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const { responseText, documentReferences } = req.body;
    const userData = req.user;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Submit response
      const response = await tx.recommendationResponse.create({
        data: {
          recommendationId,
          respondedById: userData.id,
          responseText,
        },
      });

      // 2. Add document references if provided
      if (documentReferences?.length) {
        await tx.queryDocumentReference.createMany({
          data: documentReferences.map((ref) => ({
            responseId: response.id,
            documentId: ref.documentId,
            pageNumber: ref.pageNumber,
            coordinates: ref.coordinates,
            comments: ref.comments || null,
          })),
        });
      }

      // 3. Update recommendation status
      const updatedRec = await tx.processRecommendation.update({
        where: { id: recommendationId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
        include: {
          requestedBy: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
          process: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 4. Notify requester
      await createNotification(tx, {
        type: "RECOMMENDATION_COMPLETE",
        userId: updatedRec.requestedBy.id,
        recommendationId,
        metadata: {
          processId: updatedRec.process.id,
          processName: updatedRec.process.name,
          respondedBy: {
            id: userData.id,
            name: userData.name,
            username: userData.username,
          },
        },
      });

      // 5. Return complete response data
      return await tx.processRecommendation.findUnique({
        where: { id: recommendationId },
        include: {
          requestedBy: {
            select: {
              id: true,
              name: true,
              username: true,
              signaturePicFileName: true,
            },
          },
          recommendedTo: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          process: {
            select: {
              id: true,
              name: true,
              workflow: { select: { name: true } },
            },
          },
          highlights: {
            include: {
              document: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          responses: {
            include: {
              respondedBy: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  signaturePicFileName: true,
                },
              },
              documentRefs: {
                include: {
                  document: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    res.status(200).json({
      success: true,
      data: {
        recommendation: result,
        message: "Recommendation submitted successfully",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Recommendation submission failed",
        details: error.message,
        code: "RECOMMENDATION_SUBMISSION_ERROR",
      },
    });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const { status } = req.query;
    const userData = req.user;

    const recommendations = await prisma.processRecommendation.findMany({
      where: {
        recommendedToId: userData.id,
        status: status || "PENDING",
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            username: true,
            signaturePicFileName: true,
          },
        },
        process: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                version: true,
              },
            },
            initiator: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            currentStep: {
              select: {
                id: true,
                stepName: true,
                stepNumber: true,
              },
            },
          },
        },
        highlights: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                type: true,
                path: true,
                tags: true,
              },
            },
          },
        },
        responses: {
          include: {
            respondedBy: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            documentRefs: {
              include: {
                document: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1, // Get only the latest response
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to get recommendations",
        details: error.message,
        code: "RECOMMENDATION_FETCH_ERROR",
      },
    });
  }
};

export const getRecommendationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.user;

    const recommendation = await prisma.processRecommendation.findUnique({
      where: {
        id,
        OR: [{ recommendedToId: userData.id }, { requestedById: userData.id }],
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            username: true,
            signaturePicFileName: true,
          },
        },
        recommendedTo: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        process: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                version: true,
              },
            },
            documents: {
              include: {
                document: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    path: true,
                    tags: true,
                  },
                },
                signatures: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        username: true,
                      },
                    },
                  },
                },
              },
            },
            currentStep: {
              select: {
                id: true,
                stepName: true,
                stepNumber: true,
              },
            },
          },
        },
        highlights: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                type: true,
                path: true,
                tags: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        responses: {
          include: {
            respondedBy: {
              select: {
                id: true,
                name: true,
                username: true,
                signaturePicFileName: true,
              },
            },
            documentRefs: {
              include: {
                document: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    path: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Recommendation not found",
          code: "RECOMMENDATION_NOT_FOUND",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        recommendation,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to get recommendation details",
        details: error.message,
        code: "RECOMMENDATION_DETAILS_ERROR",
      },
    });
  }
};
