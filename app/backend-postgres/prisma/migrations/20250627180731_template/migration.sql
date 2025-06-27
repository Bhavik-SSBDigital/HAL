-- CreateTable
CREATE TABLE "_DocumentToWorkflow" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentToWorkflow_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DocumentToWorkflow_B_index" ON "_DocumentToWorkflow"("B");

-- AddForeignKey
ALTER TABLE "_DocumentToWorkflow" ADD CONSTRAINT "_DocumentToWorkflow_A_fkey" FOREIGN KEY ("A") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentToWorkflow" ADD CONSTRAINT "_DocumentToWorkflow_B_fkey" FOREIGN KEY ("B") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
