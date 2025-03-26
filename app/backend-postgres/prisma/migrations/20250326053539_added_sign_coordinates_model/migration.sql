-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signaturePicFileName" TEXT;

-- CreateTable
CREATE TABLE "SignCoordinate" (
    "id" TEXT NOT NULL,
    "processDocumentId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "stepId" TEXT,
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "signedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignCoordinate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SignCoordinate" ADD CONSTRAINT "SignCoordinate_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignCoordinate" ADD CONSTRAINT "SignCoordinate_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignCoordinate" ADD CONSTRAINT "SignCoordinate_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
