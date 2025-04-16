import { PrismaClient } from "@prisma/client";
import { verifyUser } from "../utility/verifyUser.js";

const prisma = new PrismaClient();

export const postHighlight = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { remark, coordinates, documentId, context } = req.body;

    const contextTypes = [
      "queryId",
      "queryResponseId",
      "queryDoubtId",
      "recommendationId",
      "recommendationResponseId",
    ];
    const providedContexts = contextTypes.filter((type) => context[type]);

    if (providedContexts.length !== 1) {
      return res.status(400).json({
        error: "Exactly one context type must be provided",
      });
    }

    const contextField = providedContexts[0];
    const contextValue = context[contextField];

    const highlight = await prisma.documentHighlight.create({
      data: {
        documentId,
        coordinates,
        remark,
        createdById: userData.id,
        [contextField]: contextValue,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: highlight,
      message: "Highlight added successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to add highlight",
        details: error.message,
        code: "HIGHLIGHT_CREATION_ERROR",
      },
    });
  }
};

export const getHighlights = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { documentId } = req.params;
    const { contextType, contextId } = req.query;

    let whereClause = { documentId: parseInt(documentId) };

    if (contextType && contextId) {
      whereClause[contextType] = contextId;
    }

    const highlights = await prisma.documentHighlight.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        query: {
          select: {
            raisedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        queryResponse: {
          select: {
            respondedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        recommendation: {
          select: {
            requestedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        recommendationResponse: {
          select: {
            respondedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedHighlights = highlights.map((highlight) => {
      let contextInfo = {};

      if (highlight.queryId) {
        contextInfo = {
          type: "query",
          author: highlight.query.raisedBy.name,
        };
      } else if (highlight.queryResponseId) {
        contextInfo = {
          type: "queryResponse",
          author: highlight.queryResponse.respondedBy.name,
        };
      } else if (highlight.recommendationId) {
        contextInfo = {
          type: "recommendation",
          author: highlight.recommendation.requestedBy.name,
        };
      } else if (highlight.recommendationResponseId) {
        contextInfo = {
          type: "recommendationResponse",
          author: highlight.recommendationResponse.respondedBy.name,
        };
      }

      return {
        ...highlight,
        contextInfo,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedHighlights,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to retrieve highlights",
        details: error.message,
        code: "HIGHLIGHT_FETCH_ERROR",
      },
    });
  }
};
