import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  IconButton,
  Collapse,
  Tooltip,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function Replacements({ data, handleView }) {
  const [openRows, setOpenRows] = React.useState({});

  const toggleRow = (index) => {
    setOpenRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };
  return (
    <TableContainer sx={{ border: '1px solid lightgray', borderRadius: '8px' }}>
      <Typography variant="h6" align="center" sx={{ padding: '16px' }}>
        Document Replacements
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <b>Document Name</b>
            </TableCell>
            <TableCell>
              <b>Cabinet No</b>
            </TableCell>
            <TableCell>
              <b>Status</b>
            </TableCell>
            <TableCell>
              <b>Rejection Reason</b>
            </TableCell>
            <TableCell>
              <b>Actions</b>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, index) => (
            <React.Fragment key={index}>
              <TableRow>
                <TableCell>{item?.ref?.details?.name}</TableCell>
                <TableCell>{item?.ref?.cabinetNo}</TableCell>
                <TableCell>
                  {item?.ref?.rejection ? (
                    <Tooltip title="Rejected">
                      <ReportProblemIcon color="error" />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Approved">
                      <CheckCircleIcon color="success" />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{item?.ref?.rejection?.reason || '-'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => toggleRow(index)}>
                    {openRows[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                  <Button
                    onClick={() =>
                      handleView(
                        item?.ref?.details?.path,
                        item?.ref?.details?.name,
                      )
                    }
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell
                  colSpan={5}
                  style={{ paddingBottom: 0, paddingTop: 0 }}
                >
                  <Collapse in={openRows[index]} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 1 }}>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        component="div"
                      >
                        Old Versions
                      </Typography>
                      {item?.replacements?.length > 0 ? (
                        <Table
                          size="small"
                          aria-label="replacements"
                          sx={{ border: '1px solid lightgray' }}
                        >
                          <TableHead>
                            <TableRow>
                              <TableCell>
                                <b>Document Name</b>
                              </TableCell>
                              <TableCell>
                                <b>Cabinet No</b>
                              </TableCell>
                              <TableCell>
                                <b>Actions</b>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {item.replacements.map((replacement, repIndex) => (
                              <TableRow key={repIndex}>
                                <TableCell>
                                  {replacement.details.name}
                                </TableCell>
                                <TableCell>{replacement.cabinetNo}</TableCell>
                                <TableCell>
                                  <Button
                                    onClick={() =>
                                      handleView(
                                        replacement?.details?.path,
                                        replacement?.details?.name,
                                      )
                                    }
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <Typography>No Replacements Found</Typography>
                      )}
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
